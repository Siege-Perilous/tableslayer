import { db } from '$lib/db/app';
import { emailVerificationCodesTable } from '$lib/db/app/schema';
import { sendSingleEmail } from '$lib/server';
import { createSha256Hash, createShortCode } from '$lib/utils/hash';
import { eq } from 'drizzle-orm';

export const sendVerificationEmail = async (userId: string, email: string) => {
  const code = createShortCode();
  const hashedCode = await createSha256Hash(code);
  await db.delete(emailVerificationCodesTable).where(eq(emailVerificationCodesTable.userId, userId));
  const emailVerificationCode = await db
    .insert(emailVerificationCodesTable)
    .values({
      userId,
      code: hashedCode
    })
    .returning()
    .get();

  await sendSingleEmail({
    to: email,
    subject: 'Verify your email at Table Slayer',
    html: `Your verification code is: ${code}`
  });

  return emailVerificationCode;
};
