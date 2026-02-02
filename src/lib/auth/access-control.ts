import { readJsonFile, writeJsonFile } from '../db/json-store';
import { AccessControl, AccessRule } from '@/types';
import { generateId, formatDate, matchEmailPattern } from '@/utils/helpers';
import { accessControlSchema } from '@/utils/validation';

const ACCESS_CONTROL_FILE = 'access-control.json';

export async function getAccessControl(): Promise<AccessControl> {
  const data = await readJsonFile<AccessControl>(ACCESS_CONTROL_FILE);
  return accessControlSchema.parse(data);
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const { whitelist, blacklist } = await getAccessControl();

  // Check blacklist first
  for (const rule of blacklist) {
    if (rule.isActive && matchEmailPattern(email, rule.pattern)) {
      return false;
    }
  }

  // If whitelist is empty, allow all (that aren't blacklisted)
  const activeWhitelist = whitelist.filter((r) => r.isActive);
  if (activeWhitelist.length === 0) {
    return true;
  }

  // Check whitelist
  for (const rule of activeWhitelist) {
    if (matchEmailPattern(email, rule.pattern)) {
      return true;
    }
  }

  return false;
}

export async function addToWhitelist(
  pattern: string,
  notes: string = ''
): Promise<AccessRule> {
  const data = await getAccessControl();

  const newRule: AccessRule = {
    id: generateId('wl'),
    pattern,
    isActive: true,
    createdAt: formatDate(new Date()),
    notes,
  };

  data.whitelist.push(newRule);
  await writeJsonFile<AccessControl>(ACCESS_CONTROL_FILE, data);

  return newRule;
}

export async function addToBlacklist(
  pattern: string,
  notes: string = ''
): Promise<AccessRule> {
  const data = await getAccessControl();

  const newRule: AccessRule = {
    id: generateId('bl'),
    pattern,
    isActive: true,
    createdAt: formatDate(new Date()),
    notes,
  };

  data.blacklist.push(newRule);
  await writeJsonFile<AccessControl>(ACCESS_CONTROL_FILE, data);

  return newRule;
}

export async function removeAccessRule(id: string): Promise<boolean> {
  const data = await getAccessControl();

  const wlIndex = data.whitelist.findIndex((r) => r.id === id);
  if (wlIndex !== -1) {
    data.whitelist.splice(wlIndex, 1);
    await writeJsonFile<AccessControl>(ACCESS_CONTROL_FILE, data);
    return true;
  }

  const blIndex = data.blacklist.findIndex((r) => r.id === id);
  if (blIndex !== -1) {
    data.blacklist.splice(blIndex, 1);
    await writeJsonFile<AccessControl>(ACCESS_CONTROL_FILE, data);
    return true;
  }

  return false;
}

export async function toggleAccessRule(id: string): Promise<boolean> {
  const data = await getAccessControl();

  const wlRule = data.whitelist.find((r) => r.id === id);
  if (wlRule) {
    wlRule.isActive = !wlRule.isActive;
    await writeJsonFile<AccessControl>(ACCESS_CONTROL_FILE, data);
    return true;
  }

  const blRule = data.blacklist.find((r) => r.id === id);
  if (blRule) {
    blRule.isActive = !blRule.isActive;
    await writeJsonFile<AccessControl>(ACCESS_CONTROL_FILE, data);
    return true;
  }

  return false;
}
