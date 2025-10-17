import { IdentifierResourceType } from '#~/types';
import { HardwareProfileKind } from '#~/k8sTypes';
import {
  createCpuSchema,
  createMemorySchema,
  createNumericSchema,
  hardwareProfileValidationSchema,
  isHardwareProfileConfigValid,
} from '#~/concepts/hardwareProfiles/validationUtils';

describe('validationUtils', () => {
  describe('createCpuSchema', () => {
    it('should validate CPU values within range', () => {
      const schema = createCpuSchema('1', '4');

      // Valid values
      expect(schema.safeParse('2').success).toBe(true);
      expect(schema.safeParse('3').success).toBe(true);
      expect(schema.safeParse(2).success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);

      // Invalid values - below minimum
      const belowMin = schema.safeParse('0.5');
      expect(belowMin.success).toBe(false);
      if (!belowMin.success) {
        expect(belowMin.error.errors[0].message).toBe('Must be at least 1 Cores');
      }

      // Invalid values - above maximum
      const aboveMax = schema.safeParse('5');
      expect(aboveMax.success).toBe(false);
      if (!aboveMax.success) {
        expect(aboveMax.error.errors[0].message).toBe('Must not exceed 4 Cores');
      }
    });

    it('should handle CPU values with units', () => {
      const schema = createCpuSchema('1', '4');
      expect(schema.safeParse('2').success).toBe(true);
      expect(schema.safeParse('2000').success).toBe(false);
    });

    it('should allow undefined CPU values', () => {
      const schema = createCpuSchema('1', '4');
      const result = schema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should validate when maxCount is not provided', () => {
      const schema = createCpuSchema('1');
      expect(schema.safeParse('2').success).toBe(true);
      expect(schema.safeParse('100').success).toBe(true); // No upper limit
      expect(schema.safeParse('0.5').success).toBe(false);
    });

    it('should handle edge case at minimum boundary', () => {
      const schema = createCpuSchema('1', '4');
      expect(schema.safeParse('1').success).toBe(true);
    });

    it('should handle edge case at maximum boundary', () => {
      const schema = createCpuSchema('1', '4');
      expect(schema.safeParse('4').success).toBe(true);
    });
  });

  describe('createMemorySchema', () => {
    it('should validate memory values within range', () => {
      const schema = createMemorySchema('1Gi', '4Gi', true);

      // Valid values
      expect(schema.safeParse('2Gi').success).toBe(true);
      expect(schema.safeParse('3Gi').success).toBe(true);

      // Invalid values - below minimum
      const belowMin = schema.safeParse('500Mi');
      expect(belowMin.success).toBe(false);
      if (!belowMin.success) {
        expect(belowMin.error.errors[0].message).toBe('Must be at least 1 GiB');
      }

      // Invalid values - above maximum
      const aboveMax = schema.safeParse('5Gi');
      expect(aboveMax.success).toBe(false);
      if (!aboveMax.success) {
        expect(aboveMax.error.errors[0].message).toBe('Must not exceed 4 GiB');
      }
    });

    it('should handle memory values with different units', () => {
      const schema = createMemorySchema('1Gi', '4Gi', true);
      expect(schema.safeParse('2048Mi').success).toBe(true);
      expect(schema.safeParse('2G').success).toBe(true);
    });

    it('should allow undefined memory values', () => {
      const schema = createMemorySchema('1Gi', '4Gi', false);
      const result = schema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should handle edge case at minimum boundary', () => {
      const schema = createMemorySchema('1Gi', '4Gi', true);
      expect(schema.safeParse('1Gi').success).toBe(true);
    });

    it('should handle edge case at maximum boundary', () => {
      const schema = createMemorySchema('1Gi', '4Gi', true);
      expect(schema.safeParse('4Gi').success).toBe(true);
    });

    it('should validate numeric memory values need units', () => {
      const schema = createMemorySchema('1Gi', '4Gi', true);
      // Numeric values without units are invalid for memory
      expect(schema.safeParse(2048).success).toBe(false);
    });
  });

  describe('createNumericSchema', () => {
    it('should validate numeric values within range', () => {
      const schema = createNumericSchema(1, 4, true);

      // Valid values
      expect(schema.safeParse(2).success).toBe(true);
      expect(schema.safeParse('3').success).toBe(true);

      // Invalid values - below minimum
      const belowMin = schema.safeParse(0);
      expect(belowMin.success).toBe(false);
      if (!belowMin.success) {
        expect(belowMin.error.errors[0].message).toBe('Must be at least 1');
      }

      // Invalid values - above maximum
      const aboveMax = schema.safeParse(5);
      expect(aboveMax.success).toBe(false);
      if (!aboveMax.success) {
        expect(aboveMax.error.errors[0].message).toBe('Must not exceed 4');
      }

      // Invalid values - not a number
      const notNumber = schema.safeParse('abc');
      expect(notNumber.success).toBe(false);
      if (!notNumber.success) {
        expect(notNumber.error.errors[0].message).toBe('Value must be a number');
      }
    });

    it('should allow undefined numeric values', () => {
      const schema = createNumericSchema(1, 4, false);
      const result = schema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should handle edge case at minimum boundary', () => {
      const schema = createNumericSchema(1, 4, true);
      expect(schema.safeParse(1).success).toBe(true);
    });

    it('should handle edge case at maximum boundary', () => {
      const schema = createNumericSchema(1, 4, true);
      expect(schema.safeParse(4).success).toBe(true);
    });

    it('should validate string representations of numbers', () => {
      const schema = createNumericSchema(1, 4, true);
      expect(schema.safeParse('2').success).toBe(true);
    });

    it('should handle zero as a valid number', () => {
      const schema = createNumericSchema(0, 4, true);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse('0').success).toBe(true);
    });
  });

  describe('hardwareProfileValidationSchema', () => {
    const mockProfile: HardwareProfileKind = {
      apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
      kind: 'HardwareProfile',
      metadata: {
        name: 'test',
        namespace: 'test-namespace',
        annotations: {
          'opendatahub.io/display-name': 'Test Profile',
        },
      },
      spec: {
        identifiers: [
          {
            identifier: 'cpu',
            displayName: 'CPU',
            resourceType: IdentifierResourceType.CPU,
            minCount: '1',
            maxCount: '4',
            defaultCount: '2',
          },
          {
            identifier: 'memory',
            displayName: 'Memory',
            resourceType: IdentifierResourceType.MEMORY,
            minCount: '1Gi',
            maxCount: '4Gi',
            defaultCount: '2Gi',
          },
          {
            identifier: 'gpu',
            displayName: 'GPU',
            resourceType: IdentifierResourceType.ACCELERATOR,
            minCount: 0,
            maxCount: 2,
            defaultCount: 0,
          },
        ],
      },
    };

    it('should validate a valid configuration', () => {
      const validConfig = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '2',
            memory: '2Gi',
            gpu: '1',
          },
          limits: {
            cpu: '3',
            memory: '3Gi',
            gpu: '1',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should validate that limits are greater than or equal to requests', () => {
      const invalidConfig = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '3',
            memory: '3Gi',
          },
          limits: {
            cpu: '2',
            memory: '2Gi',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        const limitError = result.error.issues.find(
          (issue: { message: string }) =>
            issue.message === 'Limit must be greater than or equal to request',
        );
        expect(limitError?.message).toBe('Limit must be greater than or equal to request');
      }
    });

    it('should allow undefined values', () => {
      const configWithUndefined = {
        selectedProfile: mockProfile,
        resources: {
          requests: {},
          limits: {},
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(configWithUndefined);
      expect(result.success).toBe(true);
    });

    it('should validate each resource type independently', () => {
      const mixedConfig = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '0.5', // Below min
            memory: '5Gi', // Above max
            gpu: 'not-a-number', // Invalid type
          },
          limits: {
            cpu: '4',
            memory: '4Gi',
            gpu: '2',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(mixedConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(3); // One error for each invalid request
      }
    });

    it('should allow request without limit (isUndefinedOkay)', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '2',
            memory: '2Gi',
            gpu: 1,
          },
          limits: {
            // No limits defined
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should allow both request and limit to be undefined', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {},
          limits: {},
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should fail when limit is defined but request is undefined', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {},
          limits: {
            cpu: '2',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        const limitError = result.error.issues.find(
          (issue) => issue.message === 'Limit must be greater than or equal to request',
        );
        expect(limitError).toBeDefined();
      }
    });

    it('should validate when requests is completely undefined', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          limits: {
            cpu: '3',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should validate when limits is completely undefined', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '2',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should allow equal request and limit values', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '2',
            memory: '2Gi',
            gpu: 1,
          },
          limits: {
            cpu: '2',
            memory: '2Gi',
            gpu: 1,
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate CPU request/limit comparison correctly', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '3',
          },
          limits: {
            cpu: '2',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('cpu'))).toBe(true);
      }
    });

    it('should validate memory request/limit comparison correctly', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            memory: '3Gi',
          },
          limits: {
            memory: '2Gi',
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('memory'))).toBe(true);
      }
    });

    it('should validate GPU request/limit comparison correctly', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            gpu: 2,
          },
          limits: {
            gpu: 1,
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('gpu'))).toBe(true);
      }
    });

    it('should handle partial resource definitions', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '2',
            // memory and gpu undefined
          },
          limits: {
            cpu: '3',
            // memory and gpu undefined
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate when profile has no identifiers', () => {
      const profileWithoutIdentifiers = {
        ...mockProfile,
        spec: {},
      };

      const config = {
        selectedProfile: profileWithoutIdentifiers,
        resources: {
          requests: { cpu: '2' },
          limits: { cpu: '3' },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate when selectedProfile is undefined', () => {
      const config = {
        resources: {
          requests: { cpu: '2' },
          limits: { cpu: '3' },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate multiple validation errors at once', () => {
      const config = {
        selectedProfile: mockProfile,
        resources: {
          requests: {
            cpu: '0.5', // Below min
            memory: '500Mi', // Below min
            gpu: 'abc', // Not a number
          },
          limits: {
            cpu: '5', // Above max
            memory: '5Gi', // Above max
            gpu: '3', // Above max
          },
        },
        useExistingSettings: false,
      };

      const result = hardwareProfileValidationSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(3);
      }
    });
  });

  describe('isHardwareProfileConfigValid', () => {
    it('should return true when no resources are provided (changed behavior)', () => {
      // This tests the removal of the early validation check
      const config = {
        useExistingSettings: false,
        resources: {
          requests: {},
          limits: {},
        },
      };
      // The old version would have returned false, new version delegates to schema
      expect(isHardwareProfileConfigValid(config)).toBe(true);
    });

    it('should validate resources when provided', () => {
      const config = {
        useExistingSettings: false,
        resources: {
          requests: { cpu: '1' },
          limits: { cpu: '2' },
        },
        selectedProfile: {
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            name: 'test',
            namespace: 'test-namespace',
            annotations: {
              'opendatahub.io/display-name': 'Test Profile',
            },
          },
          spec: {
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                resourceType: IdentifierResourceType.CPU,
                minCount: '1',
                maxCount: '4',
                defaultCount: '2',
              },
            ],
          },
        },
      };
      expect(isHardwareProfileConfigValid(config)).toBe(true);
    });

    it('should return true when using existing settings', () => {
      const config = {
        useExistingSettings: true,
        resources: {
          requests: {},
          limits: {},
        },
      };
      expect(isHardwareProfileConfigValid(config)).toBe(true);
    });

    it('should return false when resources violate constraints', () => {
      const config = {
        useExistingSettings: false,
        resources: {
          requests: { cpu: '0.1' }, // Below min
          limits: { cpu: '0.2' },
        },
        selectedProfile: {
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            name: 'test',
            namespace: 'test-namespace',
            annotations: {
              'opendatahub.io/display-name': 'Test Profile',
            },
          },
          spec: {
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                resourceType: IdentifierResourceType.CPU,
                minCount: '1',
                maxCount: '4',
                defaultCount: '2',
              },
            ],
          },
        },
      };
      expect(isHardwareProfileConfigValid(config)).toBe(false);
    });

    it('should return true when requests are provided without limits (new behavior)', () => {
      const config = {
        useExistingSettings: false,
        resources: {
          requests: { cpu: '2' },
          limits: {},
        },
        selectedProfile: {
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            name: 'test',
            namespace: 'test-namespace',
            annotations: {
              'opendatahub.io/display-name': 'Test Profile',
            },
          },
          spec: {
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                resourceType: IdentifierResourceType.CPU,
                minCount: '1',
                maxCount: '4',
                defaultCount: '2',
              },
            ],
          },
        },
      };
      expect(isHardwareProfileConfigValid(config)).toBe(true);
    });

    it('should return false when limit is defined but request is not', () => {
      const config = {
        useExistingSettings: false,
        resources: {
          requests: {},
          limits: { cpu: '2' },
        },
        selectedProfile: {
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            name: 'test',
            namespace: 'test-namespace',
            annotations: {
              'opendatahub.io/display-name': 'Test Profile',
            },
          },
          spec: {
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                resourceType: IdentifierResourceType.CPU,
                minCount: '1',
                maxCount: '4',
                defaultCount: '2',
              },
            ],
          },
        },
      };
      expect(isHardwareProfileConfigValid(config)).toBe(false);
    });

    it('should delegate entirely to schema validation (no early returns)', () => {
      // This tests that we removed the early validation logic
      const config = {
        useExistingSettings: false,
        resources: {
          requests: {},
          limits: {},
        },
        selectedProfile: undefined,
      };
      // Old version would return false before schema validation
      // New version delegates to schema, which should pass
      expect(isHardwareProfileConfigValid(config)).toBe(true);
    });

    it('should handle optional requests and limits fields', () => {
      const config = {
        useExistingSettings: false,
        resources: {},
        selectedProfile: {
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            name: 'test',
            namespace: 'test-namespace',
            annotations: {
              'opendatahub.io/display-name': 'Test Profile',
            },
          },
          spec: {
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                resourceType: IdentifierResourceType.CPU,
                minCount: '1',
                maxCount: '4',
                defaultCount: '2',
              },
            ],
          },
        },
      };
      expect(isHardwareProfileConfigValid(config)).toBe(true);
    });
  });
});
