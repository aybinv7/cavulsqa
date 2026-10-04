<template>
  <AppPage :title="t('gallery.login.title')" back variant="small">
    <form
      class="mx-auto flex w-full max-w-md flex-col gap-5 px-6 pt-6"
      novalidate
      @submit.prevent="signIn"
    >
      <div class="flex flex-col items-center gap-4 pb-2 text-center">
        <M3Shape
          shape="cookie12Sided"
          class="size-24 bg-primary-container text-on-primary-container"
        >
          <i-ms-storefront-outline-rounded class="size-10" />
        </M3Shape>
        <h2 class="type-headline-small-emphasized m-0 text-on-surface">
          {{ t("gallery.login.heading") }}
        </h2>
        <p class="type-body-medium m-0 text-on-surface-variant">
          {{ t("gallery.login.subtitle") }}
        </p>
      </div>

      <M3TextField
        v-model="account.email"
        :label="t('gallery.login.email')"
        :error="emailError"
        :supporting="restored ? t('gallery.login.restored') : undefined"
        type="email"
        inputmode="email"
        autocomplete="username"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="next"
        :disabled="busy"
        @blur="touched.email = true"
      >
        <template #leading><i-ms-mail-outline-rounded /></template>
      </M3TextField>

      <M3TextField
        v-model="password"
        :label="t('gallery.login.password')"
        :error="passwordError"
        :type="reveal ? 'text' : 'password'"
        autocomplete="current-password"
        enterkeyhint="go"
        :disabled="busy"
        @blur="touched.password = true"
      >
        <template #leading><i-ms-lock-outline-rounded /></template>
        <template #trailing>
          <M3IconButton
            toggle
            :selected="reveal"
            :label="reveal ? t('gallery.login.hide') : t('gallery.login.show')"
            @update:selected="reveal = $event"
          >
            <i-ms-visibility-off-outline-rounded v-if="reveal" />
            <i-ms-visibility-outline-rounded v-else />
          </M3IconButton>
        </template>
      </M3TextField>

      <div class="flex justify-end">
        <M3Button variant="text" type="button" @click="forgot">{{
          t("gallery.login.forgot")
        }}</M3Button>
      </div>

      <M3Button type="submit" size="m" :disabled="busy">
        <template v-if="busy" #leading
          ><M3LoadingIndicator :size="24" :label="t('gallery.login.signingIn')"
        /></template>
        {{ busy ? t("gallery.login.signingIn") : t("gallery.login.signIn") }}
      </M3Button>

      <p class="type-body-small m-0 text-center text-on-surface-variant">
        {{ t("gallery.login.hint") }}
      </p>
    </form>
  </AppPage>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { useFormDraft } from "@cavulsqa/m3e-vue";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const props = defineProps<{ f7router: Router.Router }>();
const { t } = useI18n();
const snackbar = useSnackbar();

const account = reactive({ email: "" });
const password = ref("");
const reveal = ref(false);
const busy = ref(false);
const rejected = ref(false);
const touched = reactive({ email: false, password: false });
const { restored, clear } = useFormDraft("gallery.login", account);

const emailError = computed(() =>
  touched.email && !EMAIL.test(account.email.trim()) ? t("gallery.login.emailInvalid") : undefined,
);
const passwordError = computed(() => {
  if (rejected.value) return t("gallery.login.rejected");
  return touched.password && !password.value ? t("gallery.login.passwordMissing") : undefined;
});

watch(password, () => (rejected.value = false));

async function signIn() {
  touched.email = true;
  touched.password = true;
  if (emailError.value || !password.value || busy.value) return;
  busy.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (password.value !== "demo") {
      rejected.value = true;
      return;
    }
    await clear();
    password.value = "";
    void snackbar.show(t("gallery.login.welcome", { email: account.email.trim() }));
    props.f7router.back();
  } finally {
    busy.value = false;
  }
}

function forgot() {
  void snackbar.show(t("gallery.login.forgotSent"));
}
</script>
