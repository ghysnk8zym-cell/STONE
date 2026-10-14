import { useTranslations } from "next-intl";

import {
  Button,
  type ButtonVariant,
  type InteractionState,
} from "@/components/buttons/Button";
import { CarouselArrow } from "@/components/buttons/CarouselArrow";
import { IconButton } from "@/components/buttons/IconButton";
import { SocialButton } from "@/components/buttons/SocialButton";
import type { IconName } from "@/components/icons/Icon";

import { Example, Group, Section } from "../parts";

/* The arrow Figma draws after the label in the dark pill-shaped variants. */
const TRAILING_ICON: Partial<Record<ButtonVariant, IconName>> = {
  pill: "arrow",
  light: "arrow",
  graphite: "arrow",
};

/** One Button of a variant in a frozen state (default, hover, focus, pressed) or disabled. */
function Demo({
  variant,
  state,
  disabled = false,
}: {
  variant: ButtonVariant;
  state?: InteractionState;
  disabled?: boolean;
}) {
  const t = useTranslations("styleguide.buttons");
  return (
    <Button
      variant={variant}
      state={state}
      disabled={disabled}
      iconRight={TRAILING_ICON[variant]}
    >
      {t("label")}
    </Button>
  );
}

export function Buttons() {
  const t = useTranslations("styleguide");
  const states = {
    default: t("states.default"),
    hover: t("states.hover"),
    focus: t("states.focus"),
    pressed: t("states.pressed"),
    disabled: t("states.disabled"),
    loading: t("states.loading"),
    favorite: t("states.favorite"),
  };

  return (
    <Section id="buttons" title={t("sections.buttons")} intro={t("statesNote")}>
      <div className="flex flex-col gap-12">
        <Group title={t("buttons.variants.pill")}>
          <Example data-qa="button-pill-default" caption={states.default}>
            <Demo variant="pill" />
          </Example>
          <Example data-qa="button-pill-hover" caption={states.hover}>
            <Demo variant="pill" state="hover" />
          </Example>
          <Example data-qa="button-pill-focus" caption={states.focus}>
            <Demo variant="pill" state="focus" />
          </Example>
          <Example data-qa="button-pill-pressed" caption={states.pressed}>
            <Demo variant="pill" state="pressed" />
          </Example>
          <Example data-qa="button-pill-disabled" caption={states.disabled}>
            <Demo variant="pill" disabled />
          </Example>
        </Group>
        <Group title={t("buttons.variants.primary")}>
          <Example
            data-qa="button-primary-default"
            caption={states.default}
            tone="light"
          >
            <Demo variant="primary" />
          </Example>
          <Example
            data-qa="button-primary-hover"
            caption={states.hover}
            tone="light"
          >
            <Demo variant="primary" state="hover" />
          </Example>
          <Example
            data-qa="button-primary-focus"
            caption={states.focus}
            tone="light"
          >
            <Demo variant="primary" state="focus" />
          </Example>
          <Example
            data-qa="button-primary-pressed"
            caption={states.pressed}
            tone="light"
          >
            <Demo variant="primary" state="pressed" />
          </Example>
          <Example
            data-qa="button-primary-disabled"
            caption={states.disabled}
            tone="light"
          >
            <Demo variant="primary" disabled />
          </Example>
        </Group>
        <Group title={t("buttons.variants.light")}>
          <Example data-qa="button-light-default" caption={states.default}>
            <Demo variant="light" />
          </Example>
          <Example data-qa="button-light-hover" caption={states.hover}>
            <Demo variant="light" state="hover" />
          </Example>
          <Example data-qa="button-light-focus" caption={states.focus}>
            <Demo variant="light" state="focus" />
          </Example>
          <Example data-qa="button-light-pressed" caption={states.pressed}>
            <Demo variant="light" state="pressed" />
          </Example>
          <Example data-qa="button-light-disabled" caption={states.disabled}>
            <Demo variant="light" disabled />
          </Example>
        </Group>
        <Group title={t("buttons.variants.outline")}>
          <Example
            data-qa="button-outline-default"
            caption={states.default}
            tone="light"
          >
            <Demo variant="outline" />
          </Example>
          <Example
            data-qa="button-outline-hover"
            caption={states.hover}
            tone="light"
          >
            <Demo variant="outline" state="hover" />
          </Example>
          <Example
            data-qa="button-outline-focus"
            caption={states.focus}
            tone="light"
          >
            <Demo variant="outline" state="focus" />
          </Example>
          <Example
            data-qa="button-outline-pressed"
            caption={states.pressed}
            tone="light"
          >
            <Demo variant="outline" state="pressed" />
          </Example>
          <Example
            data-qa="button-outline-disabled"
            caption={states.disabled}
            tone="light"
          >
            <Demo variant="outline" disabled />
          </Example>
        </Group>
        <Group title={t("buttons.variants.graphite")}>
          <Example data-qa="button-graphite-default" caption={states.default}>
            <Demo variant="graphite" />
          </Example>
          <Example data-qa="button-graphite-hover" caption={states.hover}>
            <Demo variant="graphite" state="hover" />
          </Example>
          <Example data-qa="button-graphite-focus" caption={states.focus}>
            <Demo variant="graphite" state="focus" />
          </Example>
          <Example data-qa="button-graphite-pressed" caption={states.pressed}>
            <Demo variant="graphite" state="pressed" />
          </Example>
          <Example data-qa="button-graphite-disabled" caption={states.disabled}>
            <Demo variant="graphite" disabled />
          </Example>
        </Group>
        <Group title={t("buttons.variants.save")}>
          <Example
            data-qa="button-save-default"
            caption={states.default}
            tone="light"
          >
            <Demo variant="save" />
          </Example>
          <Example
            data-qa="button-save-hover"
            caption={states.hover}
            tone="light"
          >
            <Demo variant="save" state="hover" />
          </Example>
          <Example
            data-qa="button-save-focus"
            caption={states.focus}
            tone="light"
          >
            <Demo variant="save" state="focus" />
          </Example>
          <Example
            data-qa="button-save-pressed"
            caption={states.pressed}
            tone="light"
          >
            <Demo variant="save" state="pressed" />
          </Example>
          <Example
            data-qa="button-save-disabled"
            caption={states.disabled}
            tone="light"
          >
            <Demo variant="save" disabled />
          </Example>
        </Group>
        <Group title={t("buttons.extras")} note={t("buttons.loadingNote")}>
          <Example
            data-qa="button-primary-loading"
            caption={states.loading}
            tone="light"
          >
            <Button variant="primary" type="submit" loading>
              {t("buttons.label")}
            </Button>
          </Example>
          <Example
            data-qa="button-primary-link"
            caption={t("buttons.asLink")}
            tone="light"
          >
            <Button variant="primary" href="/">
              {t("buttons.label")}
            </Button>
          </Example>
          <Example data-qa="button-long-label" caption={t("buttons.long")}>
            {/* Stress case: the 358 px column of the 390 layout; the pill must stay inside it. */}
            <div className="w-[358px] max-w-full">
              <Button variant="pill" iconRight="arrow">
                {t("buttons.longLabel")}
              </Button>
            </div>
          </Example>
        </Group>
        <Group title={t("buttons.glass")}>
          <Example
            data-qa="icon-button-glass-search"
            caption={t("buttons.icons.search")}
          >
            <IconButton icon="search" label={t("buttons.icons.search")} />
          </Example>
          <Example
            data-qa="icon-button-glass-bag"
            caption={t("buttons.icons.bag")}
          >
            <IconButton icon="bag" label={t("buttons.icons.bag")} />
          </Example>
          <Example
            data-qa="icon-button-glass-heart"
            caption={t("buttons.icons.heart")}
          >
            <IconButton icon="heart" label={t("buttons.icons.heart")} />
          </Example>
          <Example
            data-qa="icon-button-glass-menu"
            caption={t("buttons.icons.menu")}
          >
            <IconButton icon="menu" label={t("buttons.icons.menu")} />
          </Example>
          <Example
            data-qa="icon-button-glass-close"
            caption={t("buttons.icons.close")}
          >
            <IconButton icon="close" label={t("buttons.icons.close")} />
          </Example>
          <Example
            data-qa="icon-button-glass-user-default"
            caption={states.default}
          >
            <IconButton icon="user" label={t("buttons.icons.user")} />
          </Example>
          <Example
            data-qa="icon-button-glass-user-hover"
            caption={states.hover}
          >
            <IconButton
              icon="user"
              label={t("buttons.icons.user")}
              state="hover"
            />
          </Example>
          <Example
            data-qa="icon-button-glass-user-focus"
            caption={states.focus}
          >
            <IconButton
              icon="user"
              label={t("buttons.icons.user")}
              state="focus"
            />
          </Example>
          <Example
            data-qa="icon-button-glass-user-pressed"
            caption={states.pressed}
          >
            <IconButton
              icon="user"
              label={t("buttons.icons.user")}
              state="pressed"
            />
          </Example>
          <Example
            data-qa="icon-button-glass-user-disabled"
            caption={states.disabled}
          >
            <IconButton icon="user" label={t("buttons.icons.user")} disabled />
          </Example>
        </Group>
        <Group title={t("buttons.lightTone")}>
          <Example
            data-qa="icon-button-light-heart-default"
            caption={states.default}
            tone="light"
          >
            <IconButton
              icon="heart"
              tone="light"
              label={t("buttons.icons.heart")}
            />
          </Example>
          <Example
            data-qa="icon-button-light-heart-hover"
            caption={states.hover}
            tone="light"
          >
            <IconButton
              icon="heart"
              tone="light"
              label={t("buttons.icons.heart")}
              state="hover"
            />
          </Example>
          <Example
            data-qa="icon-button-light-heart-focus"
            caption={states.focus}
            tone="light"
          >
            <IconButton
              icon="heart"
              tone="light"
              label={t("buttons.icons.heart")}
              state="focus"
            />
          </Example>
          <Example
            data-qa="icon-button-light-heart-pressed"
            caption={states.pressed}
            tone="light"
          >
            <IconButton
              icon="heart"
              tone="light"
              label={t("buttons.icons.heart")}
              state="pressed"
            />
          </Example>
          <Example
            data-qa="icon-button-light-heart-disabled"
            caption={states.disabled}
            tone="light"
          >
            <IconButton
              icon="heart"
              tone="light"
              label={t("buttons.icons.heart")}
              disabled
            />
          </Example>
          <Example
            data-qa="icon-button-light-heart-favorite"
            caption={states.favorite}
            tone="light"
          >
            <IconButton
              icon="heart"
              tone="light"
              label={t("buttons.icons.heart")}
              pressed
            />
          </Example>
        </Group>
        <Group title={t("buttons.carousel")}>
          <Group title={t("buttons.prev")}>
            <Example
              data-qa="carousel-arrow-prev-default"
              caption={states.default}
            >
              <CarouselArrow direction="prev" />
            </Example>
            <Example data-qa="carousel-arrow-prev-hover" caption={states.hover}>
              <CarouselArrow direction="prev" state="hover" />
            </Example>
            <Example data-qa="carousel-arrow-prev-focus" caption={states.focus}>
              <CarouselArrow direction="prev" state="focus" />
            </Example>
            <Example
              data-qa="carousel-arrow-prev-pressed"
              caption={states.pressed}
            >
              <CarouselArrow direction="prev" state="pressed" />
            </Example>
            <Example
              data-qa="carousel-arrow-prev-disabled"
              caption={states.disabled}
            >
              <CarouselArrow direction="prev" disabled />
            </Example>
          </Group>
          <Group title={t("buttons.next")}>
            <Example
              data-qa="carousel-arrow-next-default"
              caption={states.default}
            >
              <CarouselArrow direction="next" />
            </Example>
            <Example data-qa="carousel-arrow-next-hover" caption={states.hover}>
              <CarouselArrow direction="next" state="hover" />
            </Example>
            <Example data-qa="carousel-arrow-next-focus" caption={states.focus}>
              <CarouselArrow direction="next" state="focus" />
            </Example>
            <Example
              data-qa="carousel-arrow-next-pressed"
              caption={states.pressed}
            >
              <CarouselArrow direction="next" state="pressed" />
            </Example>
            <Example
              data-qa="carousel-arrow-next-disabled"
              caption={states.disabled}
            >
              <CarouselArrow direction="next" disabled />
            </Example>
          </Group>
        </Group>
        <Group title={t("buttons.social")}>
          <Example data-qa="social-button-tg-default" caption={states.default}>
            <SocialButton label="TG" href="/" />
          </Example>
          <Example data-qa="social-button-tg-hover" caption={states.hover}>
            <SocialButton label="TG" href="/" state="hover" />
          </Example>
          <Example data-qa="social-button-tg-focus" caption={states.focus}>
            <SocialButton label="TG" href="/" state="focus" />
          </Example>
          <Example data-qa="social-button-tg-pressed" caption={states.pressed}>
            <SocialButton label="TG" href="/" state="pressed" />
          </Example>
          <Example
            data-qa="social-button-tg-disabled"
            caption={states.disabled}
          >
            <SocialButton label="TG" href="/" disabled />
          </Example>
          <Example
            data-qa="social-button-vk-default"
            caption={t("buttons.socialNetworks.vk")}
          >
            <SocialButton label="VK" href="/" />
          </Example>
          <Example
            data-qa="social-button-ig-default"
            caption={t("buttons.socialNetworks.ig")}
          >
            <SocialButton label="IG" href="/" />
          </Example>
          <Example
            data-qa="social-button-wa-default"
            caption={t("buttons.socialNetworks.wa")}
          >
            <SocialButton label="WA" href="/" />
          </Example>
        </Group>
      </div>
    </Section>
  );
}
