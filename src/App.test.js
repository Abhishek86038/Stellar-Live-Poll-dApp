import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Stellar Live Poll header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Stellar Live Poll/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders Wallet connection section', () => {
  render(<App />);
  const walletSection = screen.getByText(/Live Poll Wallet/i);
  expect(walletSection).toBeInTheDocument();
});

test('renders instructions section', () => {
  render(<App />);
  const instructions = screen.getByText(/How to use/i);
  expect(instructions).toBeInTheDocument();
});
