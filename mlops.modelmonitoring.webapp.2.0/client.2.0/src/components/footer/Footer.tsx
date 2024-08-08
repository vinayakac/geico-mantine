import React from 'react';
import { Container, Group, Anchor } from '@mantine/core';

/**
 * Component Name: Footer
 * Description: Footer component for the web app.
 * Returns Footer component
 */

const Footer = () => {
  return (
    <footer>
      <Container style={{ padding: '0 20px' }}>
        <Group style={{ justifyContent: 'center', alignItems: 'center' }}>
          <Anchor href="" target="_blank" rel="noopener noreferrer" style={{ margin: '0 10px' }}>
            Privacy
          </Anchor>
          <Anchor
            href="https://www.geico.com/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ margin: '0 10px' }}
          >
            Personal Data Request & Notice
          </Anchor>
          <Anchor href="" target="" rel="noopener noreferrer" style={{ margin: '0 10px' }}>
            Legal & Security
          </Anchor>
          <Anchor
            href="https://forms.office.com/Pages/ResponsePage.aspx?id=wNiJcwc2XEamn31EJlApEuZapu4Y3sNBuHtEEa_pRy5UREVNWEVYREYyQ1ZKUjZET1UwRjRGVE9YMi4u&sharetoken=mNt7GhIORvK300GLSCbW"
            target="_blank"
            rel="noopener noreferrer"
            style={{ margin: '0 10px' }}
          >
            Feedback
          </Anchor>
        </Group>
      </Container>
    </footer>
  );
};

export default Footer;
