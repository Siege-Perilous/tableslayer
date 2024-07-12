import { db } from '$lib/db';
import { emailVerificationCodesTable } from '$lib/db/schema';
import { sendSingleEmail } from '$lib/server';
import { eq } from 'drizzle-orm';

export const sendVerificationEmail = async (userId: string, email: string) => {
  await db.delete(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.userId, userId));
  const emailVerificationCode = await db
    .insert(emailVerificationCodesTable)
    .values({
      userId
    })
    .returning()
    .get();

  await sendSingleEmail({
    to: email,
    subject: 'Verify your email',
    html: `Your verification code is: ${emailVerificationCode.code}`
  });

  return emailVerificationCode;
};
