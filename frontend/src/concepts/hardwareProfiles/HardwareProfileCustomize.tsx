import * as React from 'react';
import {
  FormGroup,
  Grid,
  GridItem,
  Stack,
  StackItem,
  Popover,
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import { ContainerResources, Identifier } from '#~/types';
import { CPUFieldWithCheckbox } from '#~/components/CPUField';
import { MemoryFieldWithCheckbox } from '#~/components/MemoryField';
import { NumberInputWrapperWithCheckbox } from '#~/components/NumberInputWrapper';
import { ValidationContext } from '#~/utilities/useValidation';
import {
  formatResourceValue,
  hardwareProfileIdentifierHelpMessage,
} from '#~/concepts/hardwareProfiles/utils.ts';
import { HARDWARE_PROFILES_MISSING_REQUEST_MESSAGE } from '#~/concepts/hardwareProfiles/const.ts';
import { ProfileIdentifier, ProfileIdentifierType } from './types';

type HardwareProfileCustomizeProps = {
  identifiers: Identifier[];
  hardwareValidationPath?: string[];
  hideLimitOption?: boolean;
  data: {
    resources: ContainerResources;
    uncheckedIdentifiers: {
      requests: { [key: string]: boolean };
      limits: { [key: string]: boolean };
    };
  };
  setData: (
    resources: ContainerResources,
    uncheckedIdentifiers: {
      requests: { [key: string]: boolean };
      limits: { [key: string]: boolean };
    },
  ) => void;
};

const HardwareProfileCustomize: React.FC<HardwareProfileCustomizeProps> = ({
  identifiers,
  hardwareValidationPath = [],
  hideLimitOption,
  data,
  setData,
}) => {
  // Sort identifiers to put CPU and Memory first
  const sortedIdentifiers = React.useMemo(() => {
    const cpuIdentifier = identifiers.find((i) => i.identifier === ProfileIdentifier.CPU);
    const memoryIdentifier = identifiers.find((i) => i.identifier === ProfileIdentifier.MEMORY);
    const otherIdentifiers = identifiers.filter(
      (i) => i.identifier !== ProfileIdentifier.CPU && i.identifier !== ProfileIdentifier.MEMORY,
    );

    return [
      ...(cpuIdentifier ? [cpuIdentifier] : []),
      ...(memoryIdentifier ? [memoryIdentifier] : []),
      ...otherIdentifiers,
    ];
  }, [identifiers]);

  const { getAllValidationIssues } = React.useContext(ValidationContext);

  // Store previous limit values to restore when request is re-enabled
  const previousLimitsRef = React.useRef<Record<string, string | undefined>>({});

  const renderField = (identifier: Identifier, constraintType: ProfileIdentifierType) => {
    const value = data.resources[constraintType]?.[identifier.identifier];
    const { resources, uncheckedIdentifiers } = data;
    const onChange = (identifierValue: string | undefined, checked: boolean) => {
      const identifierConstraintPresenceMap = { ...uncheckedIdentifiers[constraintType] };
      identifierConstraintPresenceMap[identifier.identifier] = checked;
      console.log('identifierValue', identifierValue);
      console.log('checked', checked);
      console.log('constraintType', constraintType);
      console.log('uncheckedIdentifiers', uncheckedIdentifiers);
      if (!checked || identifierValue === undefined) {
        console.log('FIRST IF');
        const allConstraintIdentifiers = resources[constraintType] || {}; // requests or limits
        delete allConstraintIdentifiers[identifier.identifier];
        const nextResources: ContainerResources = {
          ...resources,
          [constraintType]: allConstraintIdentifiers,
        };
        if (constraintType === ProfileIdentifierType.REQUEST) {
          console.log('FIRST IF IF');
          const identifierLimit = resources.limits?.[identifier.identifier];
          if (identifierLimit !== undefined) {
            previousLimitsRef.current[identifier.identifier] = String(identifierLimit);
          }
          const allLimits = resources.limits || {};
          delete allLimits[identifier.identifier];
          nextResources.limits = allLimits;
          const identifierLimitPresenceMap = { ...uncheckedIdentifiers.limits };
          identifierLimitPresenceMap[identifier.identifier] = false; // since identifierValue's constraint type is requests and identifierValue === undefined, this means it was unchecked

          setData(nextResources, {
            [constraintType]: identifierConstraintPresenceMap, // identifierRequestPresenceMap
            limits: identifierLimitPresenceMap,
          });
        } else {
          console.log('FIRST IF ELSE');
          setData(nextResources, {
            ...uncheckedIdentifiers,
            [constraintType]: identifierConstraintPresenceMap,
          });
        }
      } else {
        console.log('SECOND IF');
        console.log(
          'previousLimitsRef.current[identifier.identifier]',
          previousLimitsRef.current[identifier.identifier],
        );
        // identifierValue !== undefined
        const nextResources: ContainerResources = {
          ...resources,
          [constraintType]: {
            ...resources[constraintType],
            [identifier.identifier]: identifierValue,
          },
          ...(hideLimitOption && {
            limits: { ...resources.limits, [identifier.identifier]: identifierValue },
          }),
        };

        if (constraintType === ProfileIdentifierType.REQUEST) {
          nextResources.limits = {
            ...nextResources.limits,
            [identifier.identifier]:
              previousLimitsRef.current[identifier.identifier] || identifier.defaultCount,
          };

          const identifierLimitPresenceMap = { ...uncheckedIdentifiers.limits };
          identifierLimitPresenceMap[identifier.identifier] = checked;
          setData(nextResources, {
            [constraintType]: identifierConstraintPresenceMap, // identifierRequestPresenceMap
            limits: identifierLimitPresenceMap,
          });
        } else {
          setData(nextResources, {
            ...uncheckedIdentifiers,
            [constraintType]: identifierConstraintPresenceMap,
          });
        }
      }
    };

    const validationIssues = getAllValidationIssues([
      ...hardwareValidationPath,
      'resources',
      constraintType,
      identifier.identifier,
    ]);
    const validated = validationIssues.length > 0 ? 'error' : 'default';
    const isDisabled =
      constraintType === ProfileIdentifierType.LIMIT &&
      !resources.requests?.[identifier.identifier];
    const checkboxId = `${identifier.identifier}-${constraintType}-checkbox`;
    const dataTestId = `${identifier.identifier}-${constraintType}`;
    const helperMessage = hardwareProfileIdentifierHelpMessage(
      identifier.identifier,
      constraintType,
    );
    const checkboxTooltip = isDisabled ? HARDWARE_PROFILES_MISSING_REQUEST_MESSAGE : helperMessage;
    const field = (() => {
      switch (identifier.identifier) {
        case ProfileIdentifier.CPU:
          return (
            <CPUFieldWithCheckbox
              value={value}
              onChange={onChange}
              validated={validated}
              dataTestId={dataTestId}
              checkboxId={checkboxId}
              label={`CPU ${constraintType}`}
              isDisabled={isDisabled}
              checkboxTooltip={checkboxTooltip}
              min={0}
            />
          );
        case ProfileIdentifier.MEMORY:
          return (
            <MemoryFieldWithCheckbox
              value={value}
              onChange={onChange}
              validated={validated}
              dataTestId={dataTestId}
              checkboxId={checkboxId}
              label={`Memory ${constraintType}`}
              isDisabled={isDisabled}
              checkboxTooltip={checkboxTooltip}
              min={0}
            />
          );
        default:
          return (
            <NumberInputWrapperWithCheckbox
              min={0}
              value={Number(value)}
              onChange={(v, checked) => {
                console.log(v);
                onChange(v !== undefined ? String(v) : v, checked);
                console.log('On change', v, checked);
              }}
              validated={validated}
              dataTestId={dataTestId}
              checkboxId={checkboxId}
              label={`${identifier.displayName} ${constraintType}`}
              isDisabled={isDisabled}
              checkboxTooltip={checkboxTooltip}
              intOnly
              testtest={uncheckedIdentifiers}
            />
          );
      }
    })();

    const renderFormHelper = () => (
      <FormHelperText>
        <HelperText>
          {validationIssues.length > 0 && (
            <HelperTextItem variant="error">
              {validationIssues.map((issue) => issue.message).join(', ')}
            </HelperTextItem>
          )}
          <HelperTextItem>
            Min = {formatResourceValue(identifier.minCount, identifier.resourceType)}, Max ={' '}
            {identifier.maxCount === undefined
              ? 'unrestricted'
              : formatResourceValue(identifier.maxCount, identifier.resourceType)}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    );

    return (
      <FormGroup>
        {field}
        {renderFormHelper()}
      </FormGroup>
    );
  };

  return (
    <Stack hasGutter data-testid="hardware-profile-customize-form">
      {sortedIdentifiers.map((identifier) => (
        <StackItem key={identifier.identifier}>
          <Grid hasGutter md={12} lg={6}>
            <GridItem>{renderField(identifier, ProfileIdentifierType.REQUEST)}</GridItem>
            {!hideLimitOption && (
              <GridItem>{renderField(identifier, ProfileIdentifierType.LIMIT)}</GridItem>
            )}
          </Grid>
        </StackItem>
      ))}
      <StackItem>
        <Popover
          headerContent="Requests and Limits"
          minWidth="50rem"
          bodyContent={
            <Stack hasGutter>
              <StackItem>
                <p>
                  <strong>Requests:</strong> A request is the guaranteed minimum amount of a
                  resource to be used by a container. Your workload will be scheduled on a node with
                  the requested amount of resources available.
                </p>
              </StackItem>
              <StackItem>
                <p>
                  <strong>Limits:</strong> A limit is the maximum amount of a resource that can be
                  used by a container. If CPU or GPU limits are exceeded, they are throttled and the
                  container is slowed. If the memory limit is exceeded, the container is killed.
                </p>
              </StackItem>
              <StackItem>
                <p>
                  Request and limit values must be within the minimum and maximum bounds defined by
                  your administrator.
                </p>
              </StackItem>
            </Stack>
          }
        >
          <Button
            variant="link"
            isInline
            icon={<QuestionCircleIcon />}
            data-testid="requests-limits-info-button"
          >
            Learn more about requests and limits
          </Button>
        </Popover>
      </StackItem>
    </Stack>
  );
};

export default HardwareProfileCustomize;
