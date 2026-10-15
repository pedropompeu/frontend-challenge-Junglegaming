export const DEMO_PASSWORD = 'Kurio@123'

export const DEMO_USERS = [
  {
    id: 'usr_ana',
    username: 'ana_kurio',
    email: 'ana@kurio.test',
    displayName: 'Ana Souza',
    salt: 'salt-usr_ana',
    ens: 'anasouza',
    nickname: 'Ana',
  },
  {
    id: 'usr_bruno',
    username: 'bruno_lima',
    email: 'bruno@kurio.test',
    displayName: 'Bruno Lima',
    salt: 'salt-usr_bruno',
    ens: null,
    nickname: null,
  },
] as const
