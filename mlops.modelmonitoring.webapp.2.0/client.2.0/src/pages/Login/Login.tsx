import LogoSVG from '../../utils/LogoSVG';
import { useEffect, useState } from 'react';
import { UseUser } from '../../auth/UseUser';
import { UseToken } from '../../auth/UseToken';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconCoin, IconCheck, IconBrandPocket } from '@tabler/icons-react';
import { Container, Grid, Card, Button, Text, Title, Alert, Group } from '@mantine/core';

function Login() {
  const navigate = useNavigate();
  const [oauthUrl, setOauthUrl] = useState('');
  const [searchParams] = useSearchParams();
  const [token, setToken] = UseToken();
  const result = searchParams.get('result');
  const oauthtoken = searchParams.get('token');
  const apiBaseURL = import.meta.env.VITE_API_BASE_URL;
  const user = UseUser();

  useEffect(() => {
    if (oauthtoken) {
      console.log('found the token');
      setToken(oauthtoken);
      navigate('/');
      window.location.reload();
    }
  }, [oauthtoken, setToken, navigate]);

  const getUrl = async () => {
    try {
      const response = await fetch(`${apiBaseURL}/user/auth/geturl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      console.log(data);
      setOauthUrl(data.url);
    } catch (error) {
      console.error('Failed to fetch OAuth URL', error);
    }
  };

  useEffect(() => {
    getUrl();
  }, []);

  const handleLogin = () => {
    window.location.href = oauthUrl;
  };

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, oauthUrl]);

  return (
    <Container size="xl" style={{ marginTop: '2em' }}>
      <Container
        fluid
        style={{
          height: '120px',
          backgroundColor: '#EDEDED',
          marginBottom: '100px',
        }}
      >
        <Grid>
          <Grid.Col span={8}>
            <Title order={1}>ML Monitor</Title>
          </Grid.Col>
          <Grid.Col
            span={4}
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '20px',
            }}
          >
            <LogoSVG />
          </Grid.Col>
        </Grid>
        <div
          style={{ width: '100%', height: '1px', backgroundColor: '#d3d3d3', marginTop: '20px' }}
        ></div>
      </Container>
      {result === 'failed' && (
        <Alert color="red" title="Your sign-in request failed">
          Please check your access, and try again. If the issue persists, contact the administrators
          for assistance.
        </Alert>
      )}
      <Grid>
        {[
          {
            title: 'Evaluate and Compare Models',
            smtitle: 'Impact',
            description:
              'Run manual or scheduled evaluation jobs, to observe performance over time or across sub-populations.',
            icon: <IconCoin stroke={2} color="#005CCC" />,
            link: 'https://geico365.sharepoint.com/sites/AIMLSolutions/SitePages/Get-Access-to-Brille-for-Users.aspx',
          },
          {
            title: 'Monitor Data Quality and Drift',
            smtitle: 'Quality',
            description:
              'Use feature drift evaluation and data quality monitoring to ensure high-quality decisions are being made on complete data.',
            icon: <IconCheck size={24} color="#005CCC" />,
            link: 'https://geico365.sharepoint.com/sites/AIMLSolutions/SitePages/Get-Access-to-Brille-for-Users.aspx',
          },
          {
            title: 'Implement Machine Learning',
            smtitle: 'Responsibility',
            description:
              'Ensure your models are free from bias, and that they are operating legally and ethically.',
            icon: <IconBrandPocket size={24} color="#005CCC" />,
            link: 'https://geico365.sharepoint.com/sites/AIMLSolutions/SitePages/Get-Access-to-Brille-for-Users.aspx',
          },
        ].map((card, index) => (
          <Grid.Col span={4} key={index}>
            <Card
              shadow="sm"
              padding="lg"
              style={{
                position: 'relative',
                border: '1px solid #d3d3c3',
                height: '120%',
                width: '90%',
                paddingTop: 50,
              }}
            >
              <div style={{ position: 'absolute', top: 10 }}>{card.icon}</div>
              {card.smtitle}
              <Text size="lg" style={{ marginBottom: 16, fontWeight: 'bold' }}>
                {card.title}
              </Text>
              <Text size="l" style={{ marginBottom: 16, flexGrow: 1 }}>
                {card.description}
              </Text>
              <Button
                variant="gradient"
                component="a"
                href={card.link}
                gradient={{ from: '#616161', to: '#616161', deg: 0 }}
              >
                Learn More
              </Button>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
      <Group style={{ justifyContent: 'center', marginTop: '150px' }}>
        <Button onClick={() => handleLogin()} color="#005CCC">
          Sign In with Microsoft
        </Button>
        <a href="https://geico365.sharepoint.com/sites/AIMLSolutions/SitePages/Get-Access-to-Brille-for-Users.aspx">
          <Button variant="default">Request Access</Button>
        </a>
        <a href="https://geico365.sharepoint.com/sites/AIMLSolutions/SitePages/Get-Access-to-Brille-for-Users.aspx">
          <Button color="#616161">About This App</Button>
        </a>
      </Group>
    </Container>
  );
}

export default Login;
