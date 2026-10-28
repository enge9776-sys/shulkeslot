// Shulker Slot: интерактивность интерфейса, система аккаунтов, профили и настройки.

// Адрес сервера задаётся в одном месте и сохраняется в точности.
const SERVER_IP = 'malls-contrary.tun.ply.gg';

// Мобильное меню
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));
}

// Надёжное копирование IP сервера
async function copyServerIp() {
  let success = false;
  try {
    if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(SERVER_IP);
      success = true;
    }
  } catch (err) {
    success = false;
  }
  if (!success) {
    try {
      const ta = document.createElement('textarea');
      ta.value = SERVER_IP;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      success = document.execCommand('copy');
      ta.remove();
    } catch (e) {
      success = false;
    }
  }
  return success;
}

document.querySelectorAll('[data-copy-ip]').forEach(button => {
  button.addEventListener('click', async () => {
    const note = document.querySelector('#ip-note');
    if (!SERVER_IP) {
      if (note) note.textContent = 'Адрес сервера пока не указан.';
      return;
    }
    const originalHtml = button.innerHTML;
    const ok = await copyServerIp();
    if (ok) {
      button.innerHTML = 'Скопировано!';
      if (note) note.innerHTML = 'IP скопирован: <b>' + SERVER_IP + '</b>';
      setTimeout(() => {
        button.innerHTML = originalHtml;
        if (note) note.innerHTML = 'IP сервера: <b>' + SERVER_IP + '</b>';
      }, 2500);
    } else {
      if (note) note.innerHTML = 'IP сервера: <b>' + SERVER_IP + '</b>';
    }
  });
});

// Форма подачи анкеты
const applicationForm = document.querySelector('#application-form');
if (applicationForm) {
  // Автозаполнение ника из текущей сессии
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.nickname) {
    const nickInput = applicationForm.querySelector('#player-name');
    if (nickInput && !nickInput.value) {
      nickInput.value = currentUser.nickname;
    }
  }

  applicationForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!applicationForm.reportValidity()) return;
    const data = Object.fromEntries(new FormData(applicationForm).entries());
    data.submittedAt = new Date().toISOString();
    try {
      const previous = JSON.parse(localStorage.getItem('shulker-slot-applications') || '[]');
      previous.push(data);
      localStorage.setItem('shulker-slot-applications', JSON.stringify(previous));
    } catch (error) {
      // Игнорируем ошибки хранилища
    }
    window.location.href = 'successful_form.html';
  });
}

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();

/* ============================================================
   СИСТЕМА АККАУНТОВ И УПРАВЛЕНИЯ СЕССИЯМИ
   ============================================================ */
const STORAGE_ACCOUNTS = 'shulker_accounts';
const STORAGE_SESSION = 'shulker_current_user';
const STORAGE_SETTINGS = 'shulker_visual_settings';

// Аватары и их стили
const AVATAR_MAP = {
  portal_keeper: { icon: '✦', class: 'preview-purple', label: 'Хранитель портала' },
  explorer:      { icon: '✧', class: 'preview-teal',   label: 'Странник' },
  builder:       { icon: '▦', class: 'preview-green',  label: 'Зодчий' },
  redstone:      { icon: '◈', class: 'preview-blue',   label: 'Инженер' },
  alchemist:     { icon: '♧', class: 'preview-lilac',  label: 'Алхимик' },
};

function getAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS);
    if (!raw) {
      // Стартовый демо-аккаунт для быстрого тестирования (без почты)
      const seed = [
        {
          id: 'acc_demo_1',
          nickname: 'Alex_Traveler',
          password: 'password123',
          guild: 'Хранитель портала',
          avatar: 'portal_keeper',
          bio: 'Странник неизведанных земель Shulker Slot. Строю базу в тайге.',
          createdAt: new Date().toLocaleDateString('ru-RU'),
        }
      ];
      localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {}
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_SESSION);
    }
    renderNavUserSlot();
  } catch (e) {}
}

function registerAccount(nickname, password, guild, avatar) {
  const accounts = getAccounts();
  const cleanNick = nickname.trim();
  const exists = accounts.find(a => a.nickname.toLowerCase() === cleanNick.toLowerCase());
  if (exists) {
    return { success: false, message: 'Игрок с таким ником уже зарегистрирован!' };
  }

  const newAccount = {
    id: 'acc_' + Date.now(),
    nickname: cleanNick,
    password: password,
    guild: guild || 'Исследователь',
    avatar: avatar || 'portal_keeper',
    bio: 'Житель мира Shulker Slot.',
    createdAt: new Date().toLocaleDateString('ru-RU'),
  };

  accounts.push(newAccount);
  saveAccounts(accounts);
  setCurrentUser(newAccount);
  return { success: true, message: 'Аккаунт успешно создан!', user: newAccount };
}

function loginAccount(identifier, password) {
  const accounts = getAccounts();
  const clean = identifier.trim().toLowerCase();
  const user = accounts.find(a => 
    a.nickname.toLowerCase() === clean || 
    (a.contact && a.contact.toLowerCase() === clean)
  );

  if (!user) {
    return { success: false, message: 'Игрок с таким ником не найден.' };
  }
  if (user.password !== password) {
    return { success: false, message: 'Неверный пароль. Попробуй ещё раз.' };
  }

  setCurrentUser(user);
  return { success: true, message: 'Добро пожаловать обратно!', user: user };
}

function logoutAccount() {
  setCurrentUser(null);
  window.location.reload();
}

function updateAccountProfile(updatedData) {
  const current = getCurrentUser();
  if (!current) return false;

  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === current.id || a.nickname === current.nickname);
  if (idx === -1) return false;

  const updated = { ...accounts[idx], ...updatedData };
  accounts[idx] = updated;
  saveAccounts(accounts);
  setCurrentUser(updated);
  return true;
}

function changeUserPassword(oldPwd, newPwd) {
  const current = getCurrentUser();
  if (!current) return { success: false, message: 'Необходимо войти в аккаунт.' };

  const accounts = getAccounts();
  const user = accounts.find(a => a.id === current.id || a.nickname === current.nickname);
  if (!user || user.password !== oldPwd) {
    return { success: false, message: 'Неверный текущий пароль.' };
  }

  user.password = newPwd;
  saveAccounts(accounts);
  setCurrentUser(user);
  return { success: true, message: 'Пароль успешно изменён!' };
}

// Настройки сайта
function getVisualSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS);
    if (!raw) {
      return { leavesEnabled: true, cursorEnabled: true, cursorTheme: 'portal' };
    }
    return { leavesEnabled: true, cursorEnabled: true, cursorTheme: 'portal', ...JSON.parse(raw) };
  } catch (e) {
    return { leavesEnabled: true, cursorEnabled: true, cursorTheme: 'portal' };
  }
}

function saveVisualSettings(settings) {
  try {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
    applyVisualSettings();
  } catch (e) {}
}

// Отображение профиля/входа в навигации
function renderNavUserSlot() {
  let slot = document.getElementById('nav-user-slot');
  if (!slot && nav) {
    slot = document.createElement('div');
    slot.className = 'nav-user-slot';
    slot.id = 'nav-user-slot';
    nav.appendChild(slot);
  }
  if (!slot) return;

  const user = getCurrentUser();
  if (user) {
    const avatarData = AVATAR_MAP[user.avatar] || AVATAR_MAP.portal_keeper;
    slot.innerHTML = `
      <div class="user-menu-wrap" id="user-menu-wrap">
        <button class="user-menu-btn" type="button" aria-expanded="false" id="user-menu-btn">
          <span class="user-avatar-mini">${avatarData.icon}</span>
          <span class="user-name-mini">${user.nickname}</span>
          <span class="user-arrow">▾</span>
        </button>
        <div class="user-dropdown" id="user-dropdown">
          <a href="profile.html">Мой профиль</a>
          <a href="settings.html">Настройки</a>
          <button class="logout-btn" type="button" id="nav-logout-btn">Выйти</button>
        </div>
      </div>
    `;

    const wrap = slot.querySelector('#user-menu-wrap');
    const btn = slot.querySelector('#user-menu-btn');
    const logoutBtn = slot.querySelector('#nav-logout-btn');

    if (btn && wrap) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = wrap.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logoutAccount();
      });
    }
  } else {
    slot.innerHTML = `<a class="nav-auth-btn" href="auth.html">Вход в профиль</a>`;
  }
}

// Закрытие выпадающего меню при клике снаружи
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('user-menu-wrap');
  if (wrap && !wrap.contains(e.target)) {
    wrap.classList.remove('open');
    const btn = document.getElementById('user-menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
});

renderNavUserSlot();

/* ============================================================
   СТРАНИЦА АВТОРИЗАЦИИ (auth.html)
   ============================================================ */
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabBtnLogin = document.getElementById('tab-btn-login');
const tabBtnRegister = document.getElementById('tab-btn-register');
const quickDemoBtn = document.getElementById('quick-demo-btn');

if (tabBtnLogin && tabBtnRegister && loginForm && registerForm) {
  tabBtnLogin.addEventListener('click', () => {
    tabBtnLogin.classList.add('active');
    tabBtnRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  });

  tabBtnRegister.addEventListener('click', () => {
    tabBtnRegister.classList.add('active');
    tabBtnLogin.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
  });

  // Выбор аватара
  document.querySelectorAll('#avatar-grid .avatar-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('#avatar-grid .avatar-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  // Быстрый гостевой вход
  if (quickDemoBtn) {
    quickDemoBtn.addEventListener('click', () => {
      const res = loginAccount('Alex_Traveler', 'password123');
      if (res.success) {
        window.location.href = 'profile.html';
      }
    });
  }

  // Обработка формы входа
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('login-alert');
    const id = document.getElementById('login-identifier').value;
    const pwd = document.getElementById('login-password').value;

    const res = loginAccount(id, pwd);
    if (res.success) {
      alertBox.className = 'auth-alert success';
      alertBox.textContent = res.message + ' Перенаправление...';
      alertBox.style.display = 'block';
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 700);
    } else {
      alertBox.className = 'auth-alert error';
      alertBox.textContent = res.message;
      alertBox.style.display = 'block';
    }
  });

  // Обработка формы регистрации
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('register-alert');
    const nick = document.getElementById('reg-nickname').value;
    const pwd = document.getElementById('reg-password').value;
    const pwdConfirm = document.getElementById('reg-password-confirm').value;
    const guild = document.getElementById('reg-guild').value;
    const avatarInput = registerForm.querySelector('input[name="avatar"]:checked');
    const avatar = avatarInput ? avatarInput.value : 'portal_keeper';

    if (pwd !== pwdConfirm) {
      alertBox.className = 'auth-alert error';
      alertBox.textContent = 'Пароли не совпадают. Проверь правильность ввода.';
      alertBox.style.display = 'block';
      return;
    }

    const res = registerAccount(nick, pwd, guild, avatar);
    if (res.success) {
      alertBox.className = 'auth-alert success';
      alertBox.textContent = res.message + ' Добро пожаловать! Перенаправление...';
      alertBox.style.display = 'block';
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 800);
    } else {
      alertBox.className = 'auth-alert error';
      alertBox.textContent = res.message;
      alertBox.style.display = 'block';
    }
  });
}

/* ============================================================
   СТРАНИЦА ПРОФИЛЯ (profile.html)
   ============================================================ */
const profileGuest = document.getElementById('profile-guest');
const profileAuthorized = document.getElementById('profile-authorized');

if (profileGuest && profileAuthorized) {
  const user = getCurrentUser();
  if (!user) {
    profileGuest.style.display = 'block';
    profileAuthorized.style.display = 'none';
  } else {
    profileGuest.style.display = 'none';
    profileAuthorized.style.display = 'block';

    const avatarData = AVATAR_MAP[user.avatar] || AVATAR_MAP.portal_keeper;
    const avatarDisplay = document.getElementById('profile-avatar-display');
    if (avatarDisplay) {
      avatarDisplay.textContent = avatarData.icon;
      avatarDisplay.className = 'profile-avatar-large ' + avatarData.class;
    }

    const nickEl = document.getElementById('profile-nick');
    if (nickEl) nickEl.textContent = user.nickname;

    const guildEl = document.getElementById('profile-guild-badge');
    if (guildEl) guildEl.textContent = user.guild || 'Исследователь';

    const bioEl = document.getElementById('profile-bio');
    if (bioEl) bioEl.textContent = user.bio || 'Житель мира Shulker Slot.';

    const regDateEl = document.getElementById('profile-reg-date');
    if (regDateEl) regDateEl.textContent = user.createdAt || 'Недавно';

    // Статус заявки направляет в Discord
    const statusDesc = document.getElementById('app-status-desc');
    const statusTag = document.getElementById('app-status-tag');
    const statusAction = document.getElementById('app-status-action');

    if (statusTag) {
      statusTag.textContent = 'ДОСТУП В DISCORD';
      statusTag.style.borderColor = 'rgba(88,101,242,.5)';
      statusTag.style.color = '#8ea1ff';
    }
    if (statusDesc) {
      statusDesc.innerHTML = `Заявки на сервер Shulker Slot принимаются через наш официальный Discord-сервер. Заходи в канал заявок, укажи никнейм <b>${user.nickname}</b> и подключайся к <b>${SERVER_IP}</b>.`;
    }
    if (statusAction) {
      statusAction.innerHTML = `<a class="button button-primary button-discord" href="https://discord.gg/kcyupGUV4" target="_blank" rel="noopener noreferrer" style="min-height:38px;padding:0 18px;font-size:11px">Подать заявку в Discord</a>`;
    }

    // Кнопка выхода из профиля
    const logoutBtn = document.getElementById('profile-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logoutAccount();
      });
    }
  }
}

/* ============================================================
   СТРАНИЦА НАСТРОЕК (settings.html)
   ============================================================ */
const settingsGuest = document.getElementById('settings-guest');
const profileEditSec = document.getElementById('profile-edit-section');
const securitySec = document.getElementById('security-section');

if (document.getElementById('setting-leaves-toggle')) {
  const user = getCurrentUser();
  const visual = getVisualSettings();

  // Визуальные настройки сайта
  const leavesToggle = document.getElementById('setting-leaves-toggle');
  const cursorToggle = document.getElementById('setting-cursor-toggle');
  const cursorThemeSelect = document.getElementById('setting-cursor-theme');
  const saveVisualBtn = document.getElementById('save-visual-btn');
  const visualAlert = document.getElementById('visual-settings-alert');

  if (leavesToggle) leavesToggle.checked = visual.leavesEnabled !== false;
  if (cursorToggle) cursorToggle.checked = visual.cursorEnabled !== false;
  if (cursorThemeSelect) cursorThemeSelect.value = visual.cursorTheme || 'portal';

  if (saveVisualBtn) {
    saveVisualBtn.addEventListener('click', () => {
      const newSettings = {
        leavesEnabled: leavesToggle ? leavesToggle.checked : true,
        cursorEnabled: cursorToggle ? cursorToggle.checked : true,
        cursorTheme: cursorThemeSelect ? cursorThemeSelect.value : 'portal',
      };
      saveVisualSettings(newSettings);
      if (visualAlert) {
        visualAlert.className = 'auth-alert success';
        visualAlert.textContent = 'Визуальные эффекты успешно обновлены!';
        visualAlert.style.display = 'block';
        setTimeout(() => { visualAlert.style.display = 'none'; }, 2500);
      }
    });
  }

  // Настройки профиля
  if (!user) {
    if (settingsGuest) settingsGuest.style.display = 'block';
    if (profileEditSec) profileEditSec.style.display = 'none';
    if (securitySec) securitySec.style.display = 'none';
  } else {
    if (settingsGuest) settingsGuest.style.display = 'none';
    if (profileEditSec) profileEditSec.style.display = 'block';
    if (securitySec) securitySec.style.display = 'block';

    const editBio = document.getElementById('edit-bio');
    const editGuild = document.getElementById('edit-guild');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const profileAlert = document.getElementById('profile-save-alert');

    if (editBio) editBio.value = user.bio || '';
    if (editGuild) editGuild.value = user.guild || 'Исследователь';

    // Выбор аватара в настройках
    const currentAvatarRadio = document.querySelector(`input[name="settingsAvatar"][value="${user.avatar || 'portal_keeper'}"]`);
    if (currentAvatarRadio) {
      currentAvatarRadio.checked = true;
      const parentOption = currentAvatarRadio.closest('.avatar-option');
      if (parentOption) parentOption.classList.add('selected');
    }

    document.querySelectorAll('#settings-avatar-grid .avatar-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('#settings-avatar-grid .avatar-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        const r = opt.querySelector('input');
        if (r) r.checked = true;
      });
    });

    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', () => {
        const selAvatar = document.querySelector('input[name="settingsAvatar"]:checked');
        const updated = {
          bio: editBio ? editBio.value.trim() : user.bio,
          guild: editGuild ? editGuild.value : user.guild,
          avatar: selAvatar ? selAvatar.value : user.avatar,
        };
        updateAccountProfile(updated);
        renderNavUserSlot();
        if (profileAlert) {
          profileAlert.className = 'auth-alert success';
          profileAlert.textContent = 'Данные профиля успешно сохранены!';
          profileAlert.style.display = 'block';
          setTimeout(() => { profileAlert.style.display = 'none'; }, 2500);
        }
      });
    }

    // Смена пароля
    const changePwdForm = document.getElementById('change-password-form');
    if (changePwdForm) {
      changePwdForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cur = document.getElementById('current-pwd').value;
        const nw = document.getElementById('new-pwd').value;
        const pwdAlert = document.getElementById('pwd-alert');

        const res = changeUserPassword(cur, nw);
        if (res.success) {
          pwdAlert.className = 'auth-alert success';
          pwdAlert.textContent = res.message;
          pwdAlert.style.display = 'block';
          changePwdForm.reset();
        } else {
          pwdAlert.className = 'auth-alert error';
          pwdAlert.textContent = res.message;
          pwdAlert.style.display = 'block';
        }
      });
    }

    const settingsLogoutBtn = document.getElementById('settings-logout-btn');
    if (settingsLogoutBtn) {
      settingsLogoutBtn.addEventListener('click', () => {
        logoutAccount();
      });
    }
  }
}

/* ============================================================
   ОСЕННИЕ ЛИСТЬЯ: ЛЁГКИЕ CSS-АНИМАЦИИ (НА ВСЕХ СТРАНИЦАХ)
   ============================================================ */
let leavesLayer = null;

function applyVisualSettings() {
  const settings = getVisualSettings();
  if (leavesLayer) {
    leavesLayer.style.display = settings.leavesEnabled === false ? 'none' : 'block';
  }
}

(function () {
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['#e8812a', '#e3b341', '#c9801a', '#f0a640', '#9c2f1f', '#b5382a'];
  const SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c1.2 2.7 3.3 4.2 5.6 5.1-.9 1.6-.8 3.3.3 4.7 1.2-.4 2.5-.4 3.9.3-1.4 4.6-5.2 7.2-9.1 7.6l.2 3.8h-1.8l.2-3.8C7.3 18.8 3.5 16.2 2.1 11.6c1.4-.7 2.7-.7 3.9-.3 1.1-1.4 1.2-3.1.3-4.7C8.7 5.7 10.8 4.2 12 1.5z"/></svg>';
  const low = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 700;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function build(still) {
    if (leavesLayer) leavesLayer.remove();
    if (!document.body) return;
    const count = still ? 7 : (low ? 8 : 14);
    leavesLayer = document.createElement('div');
    leavesLayer.className = 'leaves' + (still ? ' still' : '');
    leavesLayer.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < count; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'leaf';
      const s = rnd(14, 30);
      const st = leaf.style;
      st.setProperty('--x', rnd(2, 96).toFixed(1) + '%');
      st.setProperty('--y', rnd(8, 92).toFixed(1) + '%');
      st.setProperty('--s', s.toFixed(1) + 'px');
      st.setProperty('--o', rnd(0.35, 0.7).toFixed(2));
      st.setProperty('--c', colors[i % colors.length]);
      st.setProperty('--d', rnd(16, 28).toFixed(1) + 's');
      st.setProperty('--delay', (-rnd(0, 26)).toFixed(1) + 's');
      st.setProperty('--sw', rnd(2.8, 5).toFixed(1) + 's');
      st.setProperty('--sp', rnd(2.4, 4.6).toFixed(1) + 's');
      st.setProperty('--drift', rnd(-90, 120).toFixed(0) + 'px');
      st.setProperty('--r', rnd(-70, 70).toFixed(0) + 'deg');
      leaf.innerHTML = '<i>' + SVG + '</i>';
      leavesLayer.appendChild(leaf);
    }
    document.body.appendChild(leavesLayer);
    applyVisualSettings();
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => build(reduceQuery && reduceQuery.matches));
    } else {
      build(reduceQuery && reduceQuery.matches);
    }
  }
  init();

  const onChange = () => build(reduceQuery && reduceQuery.matches);
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onChange);
  else if (reduceQuery.addListener) reduceQuery.addListener(onChange);

  document.addEventListener('visibilitychange', () => {
    if (leavesLayer) leavesLayer.classList.toggle('paused', document.hidden);
  });
})();

/* ============================================================
   ФИОЛЕТОВО-СИНИЙ СЛЕД ЗА КУРСОРОМ
   (не закрывает кнопки и меню, pointer-events: none, мягкое свечение)
   ============================================================ */
(function () {
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceQuery && reduceQuery.matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'cursor-trail-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none!important;z-index:90;user-select:none;';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize, { passive: true });

  // Палитры следа курсора
  const palettes = {
    portal: [
      { r: 168, g: 138, b: 255 }, // purple #a88aff
      { r: 208, g: 186, b: 255 }, // lilac #d0baff
      { r: 119, g: 186, b: 255 }, // light blue #77baff
      { r: 99,  g: 102, b: 241 }, // indigo #6366f1
      { r: 139, g: 92,  b: 246 }, // violet #8b5cf6
      { r: 85,  g: 230, b: 219 }, // teal spark #55e6db
    ],
    emerald: [
      { r: 84,  g: 224, b: 160 }, // emerald green
      { r: 85,  g: 230, b: 219 }, // teal
      { r: 52,  g: 211, b: 153 }, // mint
      { r: 16,  g: 185, b: 129 }, // deep emerald
    ],
    gold: [
      { r: 245, g: 158, b: 11  }, // amber
      { r: 251, g: 191, b: 36  }, // gold
      { r: 252, g: 211, b: 77  }, // light gold
      { r: 249, g: 115, b: 22  }, // flame orange
    ],
  };

  const particles = [];
  const history = [];
  const MAX_HISTORY = 12;
  let mouseX = -100;
  let mouseY = -100;
  let isMoving = false;
  let idleTimer = null;
  let animationFrameId = null;

  function spawnParticles(x, y, count) {
    const settings = getVisualSettings();
    if (settings.cursorEnabled === false) return;

    const currentPalette = palettes[settings.cursorTheme] || palettes.portal;
    for (let i = 0; i < count; i++) {
      const color = currentPalette[Math.floor(Math.random() * currentPalette.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.5;
      particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.2,
        size: 2.8 + Math.random() * 3.2,
        maxLife: 26 + Math.floor(Math.random() * 18),
        life: 0,
        color: color,
      });
    }
    if (particles.length > 70) {
      particles.splice(0, particles.length - 70);
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    const settings = getVisualSettings();
    if (settings.cursorEnabled === false) {
      particles.length = 0;
      history.length = 0;
      animationFrameId = null;
      return;
    }

    // Рисуем мягкую линию-шлейф за последними точками курсора
    if (history.length > 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < history.length; i++) {
        const p1 = history[i - 1];
        const p2 = history[i];
        const progress = i / history.length;
        const alpha = (progress * 0.4).toFixed(3);
        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, `rgba(139, 92, 246, ${alpha})`);
        grad.addColorStop(1, `rgba(119, 186, 255, ${alpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8 + progress * 3.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Рисуем частицы
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;

      const progress = p.life / p.maxLife;
      const alpha = Math.max(0, (1 - progress) * 0.75);
      const currentSize = Math.max(0.6, p.size * (1 - progress * 0.5));

      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
      ctx.shadowColor = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.7)`;
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.restore();

    if (!isMoving && history.length > 0) {
      history.shift();
    }

    if (particles.length > 0 || history.length > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      animationFrameId = null;
      ctx.clearRect(0, 0, width, height);
    }
  }

  function startLoop() {
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(render);
    }
  }

  function onMouseMove(e) {
    const settings = getVisualSettings();
    if (settings.cursorEnabled === false) return;

    mouseX = e.clientX;
    mouseY = e.clientY;
    history.push({ x: mouseX, y: mouseY });
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    spawnParticles(mouseX, mouseY, 2);

    isMoving = true;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      isMoving = false;
    }, 90);

    startLoop();
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true });

  window.addEventListener('mouseleave', () => {
    isMoving = false;
    history.length = 0;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      particles.length = 0;
      history.length = 0;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  });

  function attach() {
    if (document.body && !document.querySelector('.cursor-trail-canvas')) {
      document.body.appendChild(canvas);
    }
  }

  if (!document.body) {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
