/**
 * Utility functions for managing config updates
 */

import { ConfigData } from '../types';

export const updateConfig = (
  config: ConfigData,
  setConfig: (config: ConfigData) => void,
  path: string[],
  value: any
) => {
  if (!config) return;

  const newConfig = { ...config };
  let current: any = newConfig;

  for (let i = 0; i < path.length - 1; i++) {
    current[path[i]] = { ...current[path[i]] };
    current = current[path[i]];
  }

  current[path[path.length - 1]] = value;
  setConfig(newConfig);
};

export const updateArrayItem = (
  config: ConfigData,
  setConfig: (config: ConfigData) => void,
  path: string[],
  index: number,
  value: string
) => {
  if (!config) return;

  const newConfig = { ...config };
  let current: any = newConfig;

  for (let i = 0; i < path.length - 1; i++) {
    current[path[i]] = { ...current[path[i]] };
    current = current[path[i]];
  }

  const array = [...current[path[path.length - 1]]];
  array[index] = value;
  current[path[path.length - 1]] = array;
  setConfig(newConfig);
};

export const addArrayItem = (
  config: ConfigData,
  setConfig: (config: ConfigData) => void,
  path: string[]
) => {
  if (!config) return;

  const newConfig = { ...config };
  let current: any = newConfig;

  for (let i = 0; i < path.length - 1; i++) {
    current[path[i]] = { ...current[path[i]] };
    current = current[path[i]];
  }

  const array = [...current[path[path.length - 1]]];
  array.push("");
  current[path[path.length - 1]] = array;
  setConfig(newConfig);
};

export const removeArrayItem = (
  config: ConfigData,
  setConfig: (config: ConfigData) => void,
  path: string[],
  index: number
) => {
  if (!config) return;

  const newConfig = { ...config };
  let current: any = newConfig;

  for (let i = 0; i < path.length - 1; i++) {
    current[path[i]] = { ...current[path[i]] };
    current = current[path[i]];
  }

  const array = [...current[path[path.length - 1]]];
  array.splice(index, 1);
  current[path[path.length - 1]] = array;
  setConfig(newConfig);
};

