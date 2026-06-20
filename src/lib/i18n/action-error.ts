import { getTranslations } from "next-intl/server";

type ActionErrorKey =
  | "invalidInput"
  | "nameTooShort"
  | "invalidEmail"
  | "cannotChangeOwnRole"
  | "cannotRemoveSelf"
  | "emailAlreadyInvited"
  | "invalidEmailAddress"
  | "passwordTooShort"
  | "authFailed"
  | "notAuthenticated"
  | "subscriptionInactive"
  | "planLimitEmployees"
  | "planLimitTasks"
  | "acceptTermsRequired";

export async function actionError(key: ActionErrorKey): Promise<string> {
  const t = await getTranslations("errors.actions");
  return t(key);
}
