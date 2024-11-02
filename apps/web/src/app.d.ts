// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface PageData {}
    // interface Platform {}
    interface Locals {
      user: User | null;
      session: Session | null;
    }
    namespace Superforms {
      type Message = {
        type: 'error' | 'success';
        text: string;
      };
    }
  }
}

export {};
