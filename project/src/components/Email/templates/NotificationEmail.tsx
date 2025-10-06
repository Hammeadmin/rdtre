import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import React from 'react';

interface NotificationEmailProps {
  title: string;
  message: string;
  recipientName: string;
}

export function NotificationEmail({
  title,
  message,
  recipientName,
}: NotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Hej {recipientName}!</Heading>
          <Text style={paragraph}>{message}</Text>
          <Text style={footer}>
            Med vänliga hälsningar,<br />
            Farmispoolen
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '5px',
  margin: '40px auto',
  padding: '20px',
  width: '465px',
};

const heading = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '500',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const paragraph = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
};

const footer = {
  color: '#666',
  fontSize: '14px',
  fontStyle: 'italic',
  marginTop: '30px',
  textAlign: 'left' as const,
};