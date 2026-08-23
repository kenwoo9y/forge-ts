import React from 'react';

type Insets = { top: number; bottom: number; left: number; right: number };

const defaultInsets: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

export const SafeAreaProvider = ({ children }: { children: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const SafeAreaView = ({ children }: { children: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const useSafeAreaInsets = (): Insets => defaultInsets;

export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 375, height: 812 });

export const SafeAreaInsetsContext = React.createContext<Insets>(defaultInsets);
