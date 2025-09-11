import { faker } from '@faker-js/faker';

export interface TestWedding {
  id: string;
  coupleName: string;
  date: Date;
  venue: string;
  status: 'upcoming' | 'today' | 'completed';
  coordinatorId?: string;
  organizationId: string;
  guestCount: number;
}

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role:
    | 'coordinator'
    | 'photographer'
    | 'florist'
    | 'caterer'
    | 'dj'
    | 'venue_manager'
    | 'couple'
    | 'guest';
  organizationId?: string;
  weddingIds: string[];
  phoneNumber?: string;
  preferences?: {
    emailFrequency?: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
    smsEnabled?: boolean;
    emergencyOnly?: boolean;
    quietHoursEnabled?: boolean;
    quietStart?: string;
    quietEnd?: string;
    weddingDigest?: boolean;
  };
}

export class WeddingDataFactory {
  private static userCounter = 0;
  private static weddingCounter = 0;

  static createUpcomingWedding(overrides?: Partial<TestWedding>): TestWedding {
    const weddingId = `test-wedding-${++this.weddingCounter}-${Date.now()}`;
    const futureDate = faker.date.future({ years: 1 });

    return {
      id: weddingId,
      coupleName: `${faker.person.firstName()} & ${faker.person.firstName()} ${faker.person.lastName()}`,
      date: futureDate,
      venue: faker.company.name() + ' Event Center',
      status: 'upcoming',
      organizationId: `org-${weddingId}`,
      guestCount: faker.number.int({ min: 50, max: 300 }),
      ...overrides,
    };
  }

  static createTodayWedding(overrides?: Partial<TestWedding>): TestWedding {
    const weddingId = `test-wedding-today-${++this.weddingCounter}-${Date.now()}`;
    const today = new Date();
    today.setHours(15, 0, 0, 0); // 3 PM ceremony

    return {
      id: weddingId,
      coupleName: `${faker.person.firstName()} & ${faker.person.firstName()} ${faker.person.lastName()}`,
      date: today,
      venue: faker.company.name() + ' Wedding Venue',
      status: 'today',
      organizationId: `org-${weddingId}`,
      guestCount: faker.number.int({ min: 75, max: 250 }),
      ...overrides,
    };
  }

  static createCoordinator(
    weddingId?: string,
    overrides?: Partial<TestUser>,
  ): TestUser {
    const userId = `coordinator-${++this.userCounter}-${Date.now()}`;
    const weddingIds = weddingId ? [weddingId] : [];

    return {
      id: userId,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'coordinator',
      organizationId: weddingId ? `org-${weddingId}` : undefined,
      weddingIds,
      phoneNumber: faker.phone.number(),
      preferences: {
        emailFrequency: 'immediate',
        smsEnabled: true,
        emergencyOnly: false,
        quietHoursEnabled: false,
        weddingDigest: true,
      },
      ...overrides,
    };
  }

  static createPhotographer(
    weddingId?: string,
    overrides?: Partial<TestUser>,
  ): TestUser {
    const userId = `photographer-${++this.userCounter}-${Date.now()}`;
    const weddingIds = weddingId ? [weddingId] : [];

    return {
      id: userId,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'photographer',
      organizationId: `photo-org-${userId}`,
      weddingIds,
      phoneNumber: faker.phone.number(),
      preferences: {
        emailFrequency: 'immediate',
        smsEnabled: true,
        emergencyOnly: false,
        quietHoursEnabled: true,
        quietStart: '23:00',
        quietEnd: '07:00',
        weddingDigest: true,
      },
      ...overrides,
    };
  }

  static createFlorist(
    weddingId?: string,
    overrides?: Partial<TestUser>,
  ): TestUser {
    const userId = `florist-${++this.userCounter}-${Date.now()}`;
    const weddingIds = weddingId ? [weddingId] : [];

    return {
      id: userId,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'florist',
      organizationId: `floral-org-${userId}`,
      weddingIds,
      phoneNumber: faker.phone.number(),
      preferences: {
        emailFrequency: 'daily',
        smsEnabled: true,
        emergencyOnly: true,
        quietHoursEnabled: true,
        quietStart: '22:00',
        quietEnd: '08:00',
        weddingDigest: false,
      },
      ...overrides,
    };
  }

  static createVenueManager(
    weddingId?: string,
    overrides?: Partial<TestUser>,
  ): TestUser {
    const userId = `venue-${++this.userCounter}-${Date.now()}`;
    const weddingIds = weddingId ? [weddingId] : [];

    return {
      id: userId,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'venue_manager',
      organizationId: `venue-org-${userId}`,
      weddingIds,
      phoneNumber: faker.phone.number(),
      preferences: {
        emailFrequency: 'immediate',
        smsEnabled: true,
        emergencyOnly: false,
        quietHoursEnabled: false,
        weddingDigest: true,
      },
      ...overrides,
    };
  }

  static createCouple(
    weddingId?: string,
    overrides?: Partial<TestUser>,
  ): TestUser {
    const userId = `couple-${++this.userCounter}-${Date.now()}`;
    const weddingIds = weddingId ? [weddingId] : [];

    return {
      id: userId,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'couple',
      weddingIds,
      phoneNumber: faker.phone.number(),
      preferences: {
        emailFrequency: 'daily',
        smsEnabled: true,
        emergencyOnly: false,
        quietHoursEnabled: true,
        quietStart: '22:00',
        quietEnd: '08:00',
        weddingDigest: true,
      },
      ...overrides,
    };
  }

  static createGuest(
    weddingId?: string,
    overrides?: Partial<TestUser>,
  ): TestUser {
    const userId = `guest-${++this.userCounter}-${Date.now()}`;
    const weddingIds = weddingId ? [weddingId] : [];

    return {
      id: userId,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'guest',
      weddingIds,
      phoneNumber: faker.phone.number(),
      preferences: {
        emailFrequency: 'weekly',
        smsEnabled: false,
        emergencyOnly: true,
        quietHoursEnabled: true,
        quietStart: '21:00',
        quietEnd: '09:00',
        weddingDigest: false,
      },
      ...overrides,
    };
  }

  static createUser(
    role?: TestUser['role'],
    weddingId?: string,
    overrides?: Partial<TestUser>,
  ): TestUser {
    switch (role) {
      case 'coordinator':
        return this.createCoordinator(weddingId, overrides);
      case 'photographer':
        return this.createPhotographer(weddingId, overrides);
      case 'florist':
        return this.createFlorist(weddingId, overrides);
      case 'venue_manager':
        return this.createVenueManager(weddingId, overrides);
      case 'couple':
        return this.createCouple(weddingId, overrides);
      case 'guest':
        return this.createGuest(weddingId, overrides);
      default:
        return this.createPhotographer(weddingId, overrides);
    }
  }

  static createWeddingTeam(weddingId: string): TestUser[] {
    return [
      this.createCoordinator(weddingId, { name: 'Sarah Williams' }),
      this.createPhotographer(weddingId, { name: 'Mike Johnson' }),
      this.createFlorist(weddingId, { name: 'Emma Davis' }),
      this.createVenueManager(weddingId, { name: 'David Brown' }),
      this.createCouple(weddingId, { name: 'Alex & Jordan Smith' }),
    ];
  }

  static createMultipleWeddings(count: number): TestWedding[] {
    return Array.from({ length: count }, () => this.createUpcomingWedding());
  }

  static createBusyPhotographer(weddingIds: string[]): TestUser {
    return this.createPhotographer(undefined, {
      name: 'Busy Wedding Photographer',
      weddingIds: weddingIds,
      preferences: {
        emailFrequency: 'immediate',
        smsEnabled: true,
        emergencyOnly: false,
        quietHoursEnabled: true,
        quietStart: '23:30',
        quietEnd: '06:30',
        weddingDigest: true,
      },
    });
  }

  static createEmergencyScenario(): {
    wedding: TestWedding;
    team: TestUser[];
    backup: TestUser[];
  } {
    const wedding = this.createTodayWedding({
      coupleName: 'Emergency Test Couple',
      venue: 'Flood-Prone Event Center',
    });

    const team = [
      this.createCoordinator(wedding.id, {
        name: 'Primary Coordinator',
        preferences: {
          emailFrequency: 'immediate',
          smsEnabled: true,
          emergencyOnly: false,
        },
      }),
      this.createPhotographer(wedding.id, {
        name: 'Wedding Photographer',
        preferences: {
          emailFrequency: 'immediate',
          smsEnabled: true,
          emergencyOnly: false,
        },
      }),
      this.createVenueManager(wedding.id, {
        name: 'Venue Emergency Manager',
        preferences: {
          emailFrequency: 'immediate',
          smsEnabled: true,
          emergencyOnly: false,
        },
      }),
    ];

    const backup = [
      this.createCoordinator(wedding.id, {
        name: 'Backup Coordinator',
        preferences: {
          emailFrequency: 'immediate',
          smsEnabled: true,
          emergencyOnly: false,
        },
      }),
      this.createCoordinator(wedding.id, {
        name: 'Emergency Coordinator',
        preferences: {
          emailFrequency: 'immediate',
          smsEnabled: true,
          emergencyOnly: false,
        },
      }),
    ];

    return { wedding, team, backup };
  }

  static createJuneWeddingSeasonData(): {
    weddings: TestWedding[];
    suppliers: TestUser[];
  } {
    // Create 30 weddings in June (peak season)
    const juneWeddings: TestWedding[] = [];
    const baseDate = new Date('2024-06-01');

    for (let i = 0; i < 30; i++) {
      const weddingDate = new Date(baseDate);
      weddingDate.setDate(weddingDate.getDate() + i);

      juneWeddings.push(
        this.createUpcomingWedding({
          date: weddingDate,
          coupleName: `June Wedding ${i + 1}`,
          guestCount: faker.number.int({ min: 100, max: 400 }), // Larger June weddings
        }),
      );
    }

    // Create suppliers handling multiple weddings
    const suppliers: TestUser[] = [];

    // Busy photographers covering multiple weddings
    const photographer1 = this.createPhotographer(undefined, {
      name: 'Peak Season Photographer 1',
      weddingIds: juneWeddings.slice(0, 15).map((w) => w.id),
    });

    const photographer2 = this.createPhotographer(undefined, {
      name: 'Peak Season Photographer 2',
      weddingIds: juneWeddings.slice(15).map((w) => w.id),
    });

    // Busy florist covering weekend weddings
    const weekendWeddings = juneWeddings.filter((w) => {
      const day = w.date.getDay();
      return day === 5 || day === 6; // Friday or Saturday
    });

    const florist = this.createFlorist(undefined, {
      name: 'Weekend Wedding Florist',
      weddingIds: weekendWeddings.map((w) => w.id),
    });

    suppliers.push(photographer1, photographer2, florist);

    return { weddings: juneWeddings, suppliers };
  }

  static reset(): void {
    this.userCounter = 0;
    this.weddingCounter = 0;
  }
}
