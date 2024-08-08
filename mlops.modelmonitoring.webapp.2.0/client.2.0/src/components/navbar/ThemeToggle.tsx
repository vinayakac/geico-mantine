import { Switch, useMantineTheme, useMantineColorScheme, rem } from '@mantine/core';
import { IconSun, IconMoonStars } from '@tabler/icons-react';

export function ThemeToggle() {
  const theme = useMantineTheme();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const toggleColorScheme = (value: boolean) => {
    setColorScheme(value ? 'dark' : 'light');
  };

  const sunIcon = (
    <IconSun
      style={{ width: rem(16), height: rem(16) }}
      stroke={2.5}
      color={theme.colors.yellow[4]}
      aria-label="Switch to light mode"
      onClick={() => setColorScheme('light')}
    />
  );

  const moonIcon = (
    <IconMoonStars
      style={{ width: rem(16), height: rem(16) }}
      stroke={2.5}
      color="#005ccc"
      aria-label="Switch to dark mode"
      onClick={() => setColorScheme('dark')}
    />
  );

  return (
    <Switch
      size="xs"
      color="dark"
      onLabel={sunIcon}
      offLabel={moonIcon}
      onChange={(event) => toggleColorScheme(event.currentTarget.checked)}
    />
  );
}
