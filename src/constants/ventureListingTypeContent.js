export const VENTURE_LIST_CHOOSE_PATH = '/ventures/list';

export function ventureListChooseUrl(type) {
  if (type === 'co-venture' || type === 'CO_VENTURE') {
    return `${VENTURE_LIST_CHOOSE_PATH}?type=co-venture`;
  }
  return `${VENTURE_LIST_CHOOSE_PATH}?type=venture`;
}

export const VENTURE_SCENARIOS = [
  'Selling your entire business',
  'Selling part of your company',
  'Raising investment from buyers',
  'Finding someone to acquire your business',
  'Exiting and transferring ownership',
];

export const COVENTURE_SCENARIOS = [
  'Finding a business partner or co-founder',
  'Bringing in someone with skills you lack',
  'Sharing ownership with a strategic collaborator',
  'Growing the company together instead of selling out',
  'Building a business as a team',
];
