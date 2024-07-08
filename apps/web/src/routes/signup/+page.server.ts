import { db } from '$lib/db';
import { lucia } from '$lib/server/auth';
import { hash } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { generateId } from 'lucia';
import type { Actions, PageServerLoad } from './$types';

// Import the users table schema
import { usersTable } from '$lib/db/schema';

// Define a custom type for database errors
interface DatabaseError extends Error {
  code?: string;
}

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    return redirect(302, '/');
  }
  return {};
};

export const actions: Actions = {
  default: async (event) => {
    const formData = await event.request.formData();
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    if (
      typeof username !== 'string' ||
      username.length < 3 ||
      username.length > 31 ||
      !/^[a-z0-9_-]+$/.test(username)
    ) {
      return fail(400, {
        message: 'Invalid username'
      });
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 255) {
      return fail(400, {
        message: 'Invalid password'
      });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, {
        message: 'Invalid email'
      });
    }

    const passwordHash = await hash(password, {
      // recommended minimum parameters
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1
    });
    const userId = generateId(15);
    console.log('userId', userId); // 'userId 1a2b3c

    try {
      await db.insert(usersTable).values({
        id: userId,
        name: username,
        email: email,
        passwordHash: passwordHash,
        address: '' // Assuming address can be empty
      });

      const session = await lucia.createSession(userId, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });
    } catch (error) {
      const e = error as DatabaseError;
      console.log(e);

      // Handle unique constraint error
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return fail(400, {
          message: 'Username or email already used'
        });
      }
      return fail(500, {
        message: 'An unknown error occurred'
      });
    }
    return redirect(302, '/');
  }
};
