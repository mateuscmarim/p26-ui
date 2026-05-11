import { describe, it, expect, beforeEach, vi } from 'vitest';
import $ from 'jquery';
global.$ = $;
global.jQuery = $;
import { createAuth } from '../js/auth.js';

function mountForm() {
  document.body.innerHTML = `
    <form id="login-form">
      <input id="login-email" />
      <input id="login-password" type="password" />
      <button type="submit">Sign in</button>
    </form>
    <div id="login-error" hidden></div>
  `;
}

describe('createAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    mountForm();
  });

  it('getStoredToken returns null when none', () => {
    expect(createAuth({ api: {} }).getStoredToken()).toBe(null);
  });

  it('getStoredToken returns the saved token', () => {
    localStorage.setItem('cred_token', 'abc');
    expect(createAuth({ api: {} }).getStoredToken()).toBe('abc');
  });

  it('getDisplayName returns the saved name', () => {
    localStorage.setItem('cred_display_name', 'Alice');
    expect(createAuth({ api: {} }).getDisplayName()).toBe('Alice');
  });

  it('logout clears all cred_* keys', () => {
    localStorage.setItem('cred_token', 'abc');
    localStorage.setItem('cred_display_name', 'Alice');
    localStorage.setItem('cred_user_id', '1');
    localStorage.setItem('cred_email', 'a@b.com');
    createAuth({ api: {} }).logout();
    expect(localStorage.getItem('cred_token')).toBe(null);
    expect(localStorage.getItem('cred_display_name')).toBe(null);
    expect(localStorage.getItem('cred_user_id')).toBe(null);
    expect(localStorage.getItem('cred_email')).toBe(null);
  });

  it('login submit stores token + display name + invokes onLoginSuccess', async () => {
    const api = {
      login: vi.fn().mockResolvedValue({ token: 't', displayName: 'Alice', userId: 1 }),
    };
    const onSuccess = vi.fn();
    const auth = createAuth({
      api,
      $form: $('#login-form'),
      $error: $('#login-error'),
    });
    auth.onLoginSuccess(onSuccess);

    $('#login-email').val('a@b.com');
    $('#login-password').val('pw');
    $('#login-form').trigger('submit');

    await new Promise((r) => setTimeout(r, 10));

    expect(api.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    expect(localStorage.getItem('cred_token')).toBe('t');
    expect(localStorage.getItem('cred_display_name')).toBe('Alice');
    expect(localStorage.getItem('cred_user_id')).toBe('1');
    expect(localStorage.getItem('cred_email')).toBe('a@b.com');
    expect(onSuccess).toHaveBeenCalledWith('Alice');
  });

  it('shows the server error message on rejected login', async () => {
    const api = {
      login: vi.fn().mockRejectedValue({ responseJSON: { message: 'Bad creds' } }),
    };
    createAuth({
      api,
      $form: $('#login-form'),
      $error: $('#login-error'),
    });

    $('#login-email').val('a@b.com');
    $('#login-password').val('wrong');
    $('#login-form').trigger('submit');

    await new Promise((r) => setTimeout(r, 10));

    expect(localStorage.getItem('cred_token')).toBe(null);
    // jsdom does not compute layout, so jQuery :visible (offsetWidth/Height) always
    // returns false.  Check display style directly instead.
    expect($('#login-error').css('display')).not.toBe('none');
    expect($('#login-error').text()).toBe('Bad creds');
  });

  it('does not call api.login when either field is blank', async () => {
    const api = { login: vi.fn() };
    createAuth({
      api,
      $form: $('#login-form'),
      $error: $('#login-error'),
    });

    $('#login-email').val('');
    $('#login-password').val('pw');
    $('#login-form').trigger('submit');

    await new Promise((r) => setTimeout(r, 10));
    expect(api.login).not.toHaveBeenCalled();
  });
});
