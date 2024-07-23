import { appDb, emailVerificationCodesTable } from '$lib/db';
import { sendSingleEmail } from '$lib/server';
import { eq } from 'drizzle-orm';

export const sendVerificationEmail = async (userId: string, email: string) => {
  await appDb.delete(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.userId, userId));
  const emailVerificationCode = await appDb
    .insert(emailVerificationCodesTable)
    .values({
      userId
    })
    .returning()
    .get();

  await sendSingleEmail({
    to: email,
    subject: 'Verify your email at Table Slayer',
    html: `Your verification code is: ${emailVerificationCode.code}`
  });

  return emailVerificationCode;
};
