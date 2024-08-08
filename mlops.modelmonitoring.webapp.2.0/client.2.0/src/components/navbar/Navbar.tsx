import { useState, useEffect } from 'react';
import {
  Tooltip,
  UnstyledButton,
  Stack,
  rem,
  Divider,
  Drawer,
  Avatar,
  Text,
  Button,
  NavLink,
} from '@mantine/core';
import {
  IconHelp,
  IconHome2,
  IconUserCircle,
  IconLogout,
  IconMail,
  IconUserCheck,
  IconCategoryPlus,
  IconRocket,
  IconExclamationCircle,
  IconDashboard,
} from '@tabler/icons-react';
import classes from './Navbar.module.css';
import { ThemeToggle } from './ThemeToggle';
import { UseUser } from '../../auth/UseUser';
import MLlogoSVG from '../../utils/MLlogoSVG';
import HomeIconSVG from '../../utils/HomeIconSVG';
import '../../assets/Global.css';

/**
 * Component name: NavbarMinimalColored
 * Description : 
 * A global primary navigation bar utilizing the Mantine UI library
 * This component serves as the main interface for user navigation, featuring a minimalistic design with a colored theme
 * The navigation bar is designed to be minimalistic and user-friendly, providing easy access to key application

 * Usage:
 * This component should be placed at a high level in your application's component hierarchy to ensure it is 
 * accessible from all pages
 *
 * Example:
 *  jsx
 * <NavbarMinimalColored />
 */

interface NavbarLinkProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick?(): void;
}

function NavbarLink({ icon: Icon, label, active, onClick }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton onClick={onClick} className={classes.link} data-active={active || undefined}>
        <Icon style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

const navigationItems = [
  { icon: IconHome2, label: 'Home' },
  { icon: IconUserCircle, label: 'Account' },
];

function Navbar() {
  const [active, setActive] = useState(2);
  const [activeIcon, setActiveIcon] = useState('');
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const user = UseUser();

  useEffect(() => {
    async function fetchOAuthUrl() {
      const apiBaseURL = import.meta.env.VITE_API_BASE_URL;
      try {
        const response = await fetch(`${apiBaseURL}/user/auth/geturl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        setOauthUrl(data.url);
      } catch (error) {
        console.error('Failed to fetch OAuth URL:', error);
      }
    }
    fetchOAuthUrl();
  }, []);

  const handleLogin = async () => {
    window.location.href = oauthUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('brille-token');
    window.location.reload();
  };

  const renderDrawerContent = () => {
    return (
      <div style={{ marginTop: '30px' }}>
        {activeIcon === 'Account' ? (
          user ? (
            <>
              <Avatar
                key={user.name}
                name={user.name}
                color="initials"
                radius="xl"
                size="lg"
                mx="auto"
                mt="-30px"
              />
              <Text style={{ textAlign: 'center' }} size="lg" mt="sm">
                <span>
                  <strong>Securely signed in</strong>
                </span>
              </Text>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'left',
                  gap: '8px',
                  margin: '20px',
                }}
              >
                <IconMail stroke={2} style={{ width: '18px', height: '18px' }} />
                <Text size="sm" color="dimmed">
                  {user.username.toLowerCase()}
                </Text>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'left',
                  gap: '8px',
                  margin: '20px',
                }}
              >
                <IconUserCheck stroke={2} style={{ width: '18px', height: '18px' }} />
                <Text size="sm" color="dimmed">
                  {user.roles[0]}
                </Text>
              </div>

              <Button
                fullWidth
                mt="xl"
                variant="default"
                leftSection={<IconLogout size={16} />}
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button fullWidth variant="default" onClick={handleLogin} color="#6f706f">
              Sign In with Microsoft
            </Button>
          )
        ) : activeIcon === 'Home' ? (
          <>
            <NavLink
              href="#required-for-focus"
              label="Dashboard"
              leftSection={<IconDashboard size="1rem" stroke={1.5} />}
            />
            <NavLink
              href="#required-for-focus"
              label="OnBoarding"
              leftSection={<IconRocket size="1rem" stroke={1.5} />}
            />

            <NavLink
              href="#required-for-focus"
              label="About"
              leftSection={<IconExclamationCircle size="1rem" stroke={1.5} />}
            />
          </>
        ) : (
          <p>Details for {activeIcon}</p>
        )}
      </div>
    );
  };

  const handleIconClick = (iconLabel: string) => {
    setActiveIcon(iconLabel);
    setDrawerOpened(true);
  };

  const links = navigationItems.map((link, index) => (
    <NavbarLink
      {...link}
      key={link.label}
      active={index === active}
      onClick={() => setActive(index)}
    />
  ));

  return (
    <div className="nav-container">
      <nav className={classes.navbar}>
        <div className={classes.navbarMain}>
          <Stack justify="center" gap={0}>
            <NavbarLink
              icon={HomeIconSVG}
              label="Home"
              active={activeIcon === 'Home'}
              onClick={() => handleIconClick('Home')}
            />
          </Stack>
        </div>
        <div style={{ marginBottom: '9.5px' }}>
          <Divider my="md" />
        </div>
        <div className={classes.helpSection}>
          <NavbarLink
            icon={IconUserCircle}
            label="Account"
            active={activeIcon === 'Account'}
            onClick={() => handleIconClick('Account')}
          />
        </div>
        <div style={{ marginTop: '-20px', marginBottom: '10px' }}>
          <Divider my="md" />
        </div>
        <div className={classes.helpSection}>
          <NavbarLink
            icon={IconHelp}
            label="Help"
            active={false}
            onClick={() => {
              /* place holder*/
            }}
          />
        </div>
        <div style={{ marginTop: '-20px', marginBottom: '12px' }}>
          <Divider my="md" />
        </div>
        <Stack justify="center" gap={0} className={classes.logoContainer}>
          <div style={{ marginLeft: '1px', marginBottom: '25px' }}>
            <ThemeToggle />
          </div>

          <div className="logo" style={{ marginLeft: '-3px' }}>
            <MLlogoSVG width="36px" height="30px" />
          </div>
          <div className={classes.mlMonitor}>
            <div>ML</div>
            <div>MONITOR</div>
          </div>
        </Stack>
      </nav>
      <div className="main-content">
        <Drawer
          opened={drawerOpened}
          onClose={() => setDrawerOpened(false)}
          title={
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginLeft: '110px' }}>
              {activeIcon}
            </div>
          }
          padding="xs"
          size="xs"
          styles={{
            root: {
              width: '300px',
              marginLeft: '60px',
              textAlign: 'center',
            },
          }}
        >
          {renderDrawerContent()}
        </Drawer>
      </div>
    </div>
  );
}
export default Navbar;
