import { listCustomers } from "@/domains/sales/sales.repository";
import { getDatabase } from "@/shared/database/database";
import { useReactiveQuery } from "@/shared/database/queries";

/**
 * The customers a chat can share as contacts. Deferred until `wanted` first turns true, so opening
 * the conversation does not spend the database thread on a list nobody may ask for; after that it
 * stays live, and a customer added elsewhere shows up in the picker.
 */
export function useChatCustomers(wanted: Readonly<Ref<boolean>>) {
  const asked = shallowRef(false);
  watch(
    wanted,
    (value) => {
      if (value) asked.value = true;
    },
    { immediate: true },
  );

  const query = useReactiveQuery(() => listCustomers(getDatabase().db), {
    tables: ["customer"],
    queryKey: ["gallery:customers"],
    enabled: asked,
  });

  return {
    customers: computed(() => query.data.value ?? []),
    loading: query.loading,
    failed: computed(() => query.error.value !== null),
  };
}
