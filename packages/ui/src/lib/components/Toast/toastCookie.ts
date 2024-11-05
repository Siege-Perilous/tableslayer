import type { RequestEvent } from '@sveltejs/kit';
import { addToast } from '../';

export const setToastCookie = (
  event: RequestEvent,
  { title, type, body }: { title: string; type: string; body?: string }
) => {
  event.cookies.set('toast', JSON.stringify({ title, type, body }), {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 5
  });
};

export const checkToastCookie = () => {
  const toastCookie = document.cookie.split('; ').find((row) => row.startsWith('toast='));

  if (toastCookie) {
    const toastData = JSON.parse(decodeURIComponent(toastCookie.split('=')[1]));
    addToast({ data: { title: toastData.title, type: toastData.type } });
    document.cookie = 'toast=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
};
