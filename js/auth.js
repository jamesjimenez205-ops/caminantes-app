// Acceso con usuario y contraseña. Las cuentas están en accounts.js (solo hashes PBKDF2).
// Es una barrera de acceso a la interfaz: los datos viven en el navegador de cada persona.
const Auth = (() => {
  const SESSION = 'caminantes-sesion';
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function derive(pw, salt) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: 150000, hash: 'SHA-256' }, key, 256));
  }

  return {
    isOpen: () => { try { return sessionStorage.getItem(SESSION) === '1'; } catch { return false; } },
    logout() { try { sessionStorage.removeItem(SESSION); } catch { /* nada */ } location.reload(); },

    gate() {
      if (this.isOpen()) return Promise.resolve();
      return new Promise(resolve => {
        const el = document.createElement('div');
        el.id = 'auth';
        el.innerHTML = `<div class="auth-card"><img class="group-logo" src="${GROUP.logo}" alt="Logo del grupo">
          <h1>${GROUP.name}</h1><p class="muted">${GROUP.tagline} · Progreso de las secciones</p>
          <form id="af"><label>Usuario<input name="u" autocomplete="username" autocapitalize="none" required autofocus maxlength="32" pattern="[A-Za-z0-9._\-]+"></label>
          <label>Contraseña<input name="p" type="password" autocomplete="current-password" required maxlength="128"></label>
          <p class="auth-err" id="ae"></p><button class="btn primary big">Entrar</button></form></div>`;
        document.body.appendChild(el);
        const err = m => (el.querySelector('#ae').textContent = m);
        let fails = 0;
        el.querySelector('#af').addEventListener('submit', async e => {
          e.preventDefault();
          if (!window.crypto?.subtle) return err('Abre la app desde una dirección segura (https).');
          let u, p;
          try { [u, p] = V.login(new FormData(e.target).get('u'), new FormData(e.target).get('p')); }
          catch (er) { fails++; return err(er.message); }
          const acc = ACCOUNTS.find(a => a.user === u);
          if (acc && await derive(p, acc.salt) === acc.hash) {
            try { sessionStorage.setItem(SESSION, '1'); } catch { /* nada */ }
            el.remove(); return resolve();
          }
          fails++; await wait(Math.min(fails, 5) * 600);
          err('Usuario o contraseña incorrectos');
        });
      });
    },
  };
})();
