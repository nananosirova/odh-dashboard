import { z } from 'zod';
import {
  CPU_UNITS,
  isCpuLimitLarger,
  isMemoryLimitLarger,
  MEMORY_UNITS_FOR_PARSING,
  splitValueUnit,
  ValueUnitCPU,
  ValueUnitString,
} from '#~/utilities/valueUnits';
import { HardwareProfileKind } from '#~/k8sTypes';
import { IdentifierResourceType } from '#~/types';
import { HardwareProfileConfig } from './useHardwareProfileConfig';
import { formatResourceValue } from './utils';

export enum ValidationErrorCodes {
  LIMIT_BELOW_REQUEST = 'limit_below_request',
}

export type ResourceSchema = z.ZodEffects<
  z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodUndefined]>,
  string | number | undefined,
  string | number | undefined
>;

export const createCpuSchema = (
  minCount: ValueUnitCPU,
  maxCount?: ValueUnitCPU,
  checked = true,
): ResourceSchema =>
  z.union([z.string(), z.number(), z.undefined()]).superRefine((val, ctx) => {
    if (val === undefined && !checked) {
      return;
    }
    const stringVal = String(val);
    const [value] = splitValueUnit(stringVal, CPU_UNITS);
    if (value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `CPU must be provided`,
      });
    }
    if (isCpuLimitLarger(stringVal, minCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${formatResourceValue(minCount, IdentifierResourceType.CPU)}`,
      });
    }
    if (maxCount && isCpuLimitLarger(maxCount, stringVal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${formatResourceValue(maxCount, IdentifierResourceType.CPU)}`,
      });
    }
  });

export const createMemorySchema = (
  minCount: ValueUnitString,
  maxCount: ValueUnitString,
  checked: boolean,
): ResourceSchema =>
  z.union([z.string(), z.number(), z.undefined()]).superRefine((val, ctx) => {
    if (val === undefined && !checked) {
      return;
    }
    const stringVal = String(val);
    const [value] = splitValueUnit(stringVal, MEMORY_UNITS_FOR_PARSING);
    if (value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Memory must be provided`,
      });
    }
    if (isMemoryLimitLarger(stringVal, minCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${formatResourceValue(minCount, IdentifierResourceType.MEMORY)}`,
      });
    }
    if (isMemoryLimitLarger(maxCount, stringVal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${formatResourceValue(maxCount, IdentifierResourceType.MEMORY)}`,
      });
    }
  });

export const createNumericSchema = (
  minCount: number,
  maxCount: number,
  checked: boolean,
): ResourceSchema =>
  z.union([z.string(), z.number(), z.undefined()]).superRefine((val, ctx) => {
    if (val === undefined && !checked) {
      return;
    }
    const value = Number(val);
    if (Number.isNaN(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Value must be a number',
      });
      return;
    }
    if (value < minCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at least ${formatResourceValue(
          minCount,
          IdentifierResourceType.ACCELERATOR,
        )}`,
      });
    }
    if (value > maxCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must not exceed ${formatResourceValue(
          maxCount,
          IdentifierResourceType.ACCELERATOR,
        )}`,
      });
    }
  });

export const hardwareProfileValidationSchema = z
  .object({
    selectedProfile: z.custom<HardwareProfileKind>().optional(),
    resources: z.object({
      requests: z.record(z.union([z.string(), z.number(), z.undefined()])).optional(),
      limits: z.record(z.union([z.string(), z.number(), z.undefined()])).optional(),
    }),
    useExistingSettings: z.boolean(),
    uncheckedIdentifiers: z
      .object({
        requests: z.record(z.boolean()),
        limits: z.record(z.boolean()),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.selectedProfile?.spec.identifiers) {
      return;
    }
    const { uncheckedIdentifiers } = data;

    data.selectedProfile.spec.identifiers.forEach((identifier) => {
      const request = data.resources.requests?.[identifier.identifier];
      const limit = data.resources.limits?.[identifier.identifier];

      const isRequestChecked = uncheckedIdentifiers
        ? uncheckedIdentifiers.requests[identifier.identifier] ?? false
        : request !== undefined;
      const isLimitChecked = uncheckedIdentifiers
        ? uncheckedIdentifiers.limits[identifier.identifier] ?? false
        : limit !== undefined;

      let requestSchema: ResourceSchema;
      let limitSchema: ResourceSchema;

      if (identifier.identifier === 'cpu') {
        requestSchema = createCpuSchema(identifier.minCount, identifier.maxCount, isRequestChecked);
        limitSchema = createCpuSchema(identifier.minCount, identifier.maxCount, isLimitChecked);
      } else if (identifier.identifier === 'memory') {
        requestSchema = createMemorySchema(
          String(identifier.minCount),
          String(identifier.maxCount),
          isRequestChecked,
        );
        limitSchema = createMemorySchema(
          String(identifier.minCount),
          String(identifier.maxCount),
          isLimitChecked,
        );
      } else {
        requestSchema = createNumericSchema(
          Number(identifier.minCount),
          Number(identifier.maxCount),
          isRequestChecked,
        );
        limitSchema = createNumericSchema(
          Number(identifier.minCount),
          Number(identifier.maxCount),
          isLimitChecked,
        );
      }

      const requestResult = requestSchema.safeParse(request);
      const limitResult = limitSchema.safeParse(limit);

      if (!requestResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resources', 'requests', identifier.identifier],
          message: requestResult.error.errors[0].message,
        });
      }

      if (!limitResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resources', 'limits', identifier.identifier],
          message: limitResult.error.errors[0].message,
        });
      }

      const isUndefinedOkay =
        (isRequestChecked && !isLimitChecked) || (!isRequestChecked && !isLimitChecked);

      // console.log('isUndefinedOkay', isUndefinedOkay);
      // console.log('isRequestChecked', isRequestChecked);
      // console.log('isLimitChecked', isLimitChecked);
      if (requestResult.success && limitResult.success) {
        const isValid =
          identifier.identifier === 'cpu'
            ? isCpuLimitLarger(request, limit, true, isUndefinedOkay)
            : identifier.identifier === 'memory'
            ? isMemoryLimitLarger(String(request), String(limit), true, isUndefinedOkay)
            : Number(limit) >= Number(request) || isUndefinedOkay;

        if (!isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            params: { code: ValidationErrorCodes.LIMIT_BELOW_REQUEST },
            path: ['resources', 'limits', identifier.identifier],
            message: 'Limit must be greater than or equal to request',
          });
        }
      }
    });
  });

export const isHardwareProfileConfigValid = (data: HardwareProfileConfig): boolean => {
  const result = hardwareProfileValidationSchema.safeParse(data);
  return result.success;
};
