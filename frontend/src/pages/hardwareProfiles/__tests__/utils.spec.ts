import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { Identifier, IdentifierResourceType } from '#~/types';
import {
  determineIdentifierUnit,
  isHardwareProfileIdentifierValid,
  isHardwareProfileValid,
  validateProfileWarning,
} from '#~/pages/hardwareProfiles/utils';
import { HardwareProfileWarningType } from '#~/concepts/hardwareProfiles/types';
import { CPU_UNITS, MEMORY_UNITS_FOR_SELECTION, OTHER } from '#~/utilities/valueUnits';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

describe('validateProfileWarning', () => {
  it('should generate warnings for min being larger than max', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-1',
      enabled: false,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '20Gi',
          maxCount: '11Gi',
          defaultCount: '7Gi',
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '1',
          maxCount: '2',
          defaultCount: '1',
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.OUT_OF_RANGE,
        message: 'Minimum allowed value cannot exceed the maximum allowed value (if specified).',
      },
      {
        type: HardwareProfileWarningType.OUT_OF_RANGE,
        message:
          'Default value must be equal to or between the minimum and maximum allowed limits.',
      },
    ]);
  });

  it('should generate warnings for negative min value', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-2',
      enabled: false,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '2Gi',
          maxCount: '5Gi',
          defaultCount: '2Gi',
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '-1',
          maxCount: '2',
          defaultCount: '1',
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.CANNOT_BE_NEGATIVE,
        message: `Minimum count for ${IdentifierResourceType.CPU} cannot be negative. Edit the profile to make the profile valid.`,
      },
    ]);
  });

  it('should generate warnings for negative max value and negative default count', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-3',
      enabled: false,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '2Gi',
          maxCount: '5Gi',
          defaultCount: '-2Gi',
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '1',
          maxCount: '-2',
          defaultCount: '1',
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.OUT_OF_RANGE,
        message:
          'Default value must be equal to or between the minimum and maximum allowed limits.',
      },
      {
        type: HardwareProfileWarningType.CANNOT_BE_NEGATIVE,
        message: `Default count for ${IdentifierResourceType.MEMORY} cannot be negative. Edit the profile to make the profile valid.`,
      },
      {
        type: HardwareProfileWarningType.CANNOT_BE_NEGATIVE,
        message: `Maximum count for ${IdentifierResourceType.CPU} cannot be negative. Edit the profile to make the profile valid.`,
      },
    ]);
  });

  it('should generate warnings for invalid identifier counts', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-4',
      enabled: false,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: 'Invalid',
          maxCount: '5Gi',
          defaultCount: '2Gi',
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '1',
          maxCount: '2',
          defaultCount: '1',
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.OUT_OF_RANGE,
        message: 'Minimum allowed value cannot exceed the maximum allowed value (if specified).',
      },
      {
        type: HardwareProfileWarningType.OUT_OF_RANGE,
        message:
          'Default value must be equal to or between the minimum and maximum allowed limits.',
      },
      {
        type: HardwareProfileWarningType.INVALID_UNIT,
        message: `The resource count for ${IdentifierResourceType.MEMORY} has an invalid unit. Edit the profile to make the profile valid.`,
      },
    ]);
  });

  it('should generate warnings for missing identifier counts', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-4',
      enabled: false,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: 'Gi',
          maxCount: '5Gi',
          defaultCount: '2Gi',
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '1',
          maxCount: '2',
          defaultCount: '1',
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.MISSING_VALUE,
        message: 'Minimum allowed value must be provided.',
      },
    ]);
  });

  it('should generate warnings for decimal minimum and maximum count', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-7',
      enabled: true,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '0.239879842Gi',
          maxCount: '5Gi',
          defaultCount: '2Gi',
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: 1,
          maxCount: '4.88',
          defaultCount: 2,
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.CANNOT_BE_DECIMAL,
        message: `Minimum count for ${IdentifierResourceType.MEMORY} cannot be a decimal. Edit the profile to make the profile valid.`,
      },
      {
        type: HardwareProfileWarningType.CANNOT_BE_DECIMAL,
        message: `Maximum count for ${IdentifierResourceType.CPU} cannot be a decimal. Edit the profile to make the profile valid.`,
      },
    ]);
  });

  it('should generate warnings for decimal default count', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-8',
      enabled: false,
      identifiers: [
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '1Gi',
          maxCount: '5Gi',
          defaultCount: '2.2384092380Gi',
        },
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '5',
          maxCount: '10',
          defaultCount: '6',
        },
      ],
    });
    const hardwareProfilesResult = validateProfileWarning(hardwareProfileMock);
    expect(hardwareProfilesResult).toEqual([
      {
        type: HardwareProfileWarningType.CANNOT_BE_DECIMAL,
        message: `Default count for ${IdentifierResourceType.MEMORY} cannot be a decimal. Edit the profile to make the profile valid.`,
      },
    ]);
  });
});

describe('isHardwareProfileIdentifierValid', () => {
  it('should generate warnings for min being larger than max', () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '50Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should return true for valid identifiers', () => {
    const identifierMock = {
      displayName: 'CPU',
      identifier: 'cpu',
      resourceType: IdentifierResourceType.CPU,
      minCount: '1',
      maxCount: '2',
      defaultCount: '1',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(true);
  });

  it('should generate warnings for negative min value', () => {
    const identifierMock = {
      displayName: 'CPU',
      identifier: 'cpu',
      resourceType: IdentifierResourceType.CPU,
      minCount: '-100',
      maxCount: '2',
      defaultCount: '1',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for negative max value', async () => {
    const identifierMock = {
      displayName: 'CPU',
      identifier: 'cpu',
      resourceType: IdentifierResourceType.CPU,
      minCount: '1',
      maxCount: '-0.20',
      defaultCount: '1',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for negative default count', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '2Gi',
      maxCount: '5Gi',
      defaultCount: '-200Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for invalid identifier counts', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: 'Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for default value outside of min/max range', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '0Gi',
      maxCount: '5Gi',
      defaultCount: '6Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for decimal max', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '0Gi',
      maxCount: '5.428Gi',
      defaultCount: '2Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });

  it('should generate warnings for decimal min', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '0.93Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });
  it('should generate warnings for decimal default count', async () => {
    const identifierMock = {
      displayName: 'Memory',
      identifier: 'memory',
      resourceType: IdentifierResourceType.MEMORY,
      minCount: '0Gi',
      maxCount: '5Gi',
      defaultCount: '2.999Gi',
    };
    expect(isHardwareProfileIdentifierValid(identifierMock)).toEqual(false);
  });
});

describe('determine unit', () => {
  it('should correctly return CPU units', () => {
    const nodeCPUResource: Identifier = {
      displayName: 'CPU',
      identifier: 'cpu',
      minCount: '1',
      maxCount: '2',
      defaultCount: '1',
      resourceType: IdentifierResourceType.CPU,
    };
    expect(determineIdentifierUnit(nodeCPUResource)).toEqual(CPU_UNITS);
  });
  it('should correctly return memory units', () => {
    const nodeMemoryResource: Identifier = {
      displayName: 'Memory',
      identifier: 'memory',
      minCount: '2Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
      resourceType: IdentifierResourceType.MEMORY,
    };
    expect(determineIdentifierUnit(nodeMemoryResource)).toEqual(MEMORY_UNITS_FOR_SELECTION);
  });
  it('should correctly return other if resource type is unknown', () => {
    const nodeUnknownResource: Identifier = {
      displayName: 'GPU',
      identifier: 'gpu',
      minCount: '2Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
    };
    expect(determineIdentifierUnit(nodeUnknownResource)).toEqual(OTHER);
  });
});

describe('isHardwareProfileValid', () => {
  it('should return true for a profile with valid CPU and Memory identifiers', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-valid',
      enabled: true,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '1',
          maxCount: '4',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '1Gi',
          maxCount: '8Gi',
          defaultCount: '4Gi',
        },
      ],
    });

    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(true);
  });

  it('should return true for a profile with empty identifiers', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-empty',
      enabled: true,
      identifiers: [],
    });

    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(true);
  });

  it('should return true for a profile with only GPU identifier', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-gpu-only',
      enabled: true,
      identifiers: [
        {
          displayName: 'GPU',
          identifier: 'nvidia.com/gpu',
          minCount: '1',
          maxCount: '4',
          defaultCount: '1',
        },
      ],
    });

    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(true);
  });

  it('should return true for a profile with only CPU', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-cpu-only',
      enabled: true,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '1',
          maxCount: '4',
          defaultCount: '2',
        },
      ],
    });

    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(true);
  });

  it('should return false for a profile with negative values', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-negative',
      enabled: true,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '-1',
          maxCount: '4',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '1Gi',
          maxCount: '8Gi',
          defaultCount: '4Gi',
        },
      ],
    });

    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(false);
  });

  it('should return false for a profile with min > max', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-out-of-range',
      enabled: true,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '10',
          maxCount: '4',
          defaultCount: '5',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '1Gi',
          maxCount: '8Gi',
          defaultCount: '4Gi',
        },
      ],
    });

    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(false);
  });

  it('should return false for a profile with decimal values', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-decimal',
      enabled: true,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '1',
          maxCount: '4',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '1.5Gi',
          maxCount: '8Gi',
          defaultCount: '4Gi',
        },
      ],
    });

    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(false);
  });

  it('should return false for a profile with default value outside min/max range', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-default-out-of-range',
      enabled: true,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '1',
          maxCount: '4',
          defaultCount: '8',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '1Gi',
          maxCount: '8Gi',
          defaultCount: '4Gi',
        },
      ],
    });

    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(false);
  });

  it('should return false for a profile with both MISSING_CPU_MEMORY and other errors', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-multiple-errors',
      enabled: true,
      identifiers: [
        {
          displayName: 'GPU',
          identifier: 'nvidia.com/gpu',
          minCount: '-1',
          maxCount: '4',
          defaultCount: '1',
        },
      ],
    });
    // Has both MISSING_CPU_MEMORY (no CPU/Memory) and CANNOT_BE_NEGATIVE (negative minCount)
    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(false);
  });

  it('should return false for a profile with invalid unit', () => {
    const hardwareProfileMock = mockHardwareProfile({
      uid: 'test-invalid-unit',
      enabled: true,
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          resourceType: IdentifierResourceType.CPU,
          minCount: '1xyz',
          maxCount: '4',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          resourceType: IdentifierResourceType.MEMORY,
          minCount: '1Gi',
          maxCount: '8Gi',
          defaultCount: '4Gi',
        },
      ],
    });
    expect(isHardwareProfileValid(hardwareProfileMock)).toBe(false);
  });
});
