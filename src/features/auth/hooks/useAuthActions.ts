import { signInWithGoogle, signInWithPassword, signUpWithPassword } from "@/services/authService";

export function useAuthActions() {
  return { signInWithGoogle, signInWithPassword, signUpWithPassword };
}
