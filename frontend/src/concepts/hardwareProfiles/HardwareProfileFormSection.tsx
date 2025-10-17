import * as React from 'react';
import { FormGroup, Stack, StackItem, ExpandableSection } from '@patternfly/react-core';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { useValidation, ValidationContext } from '#~/utilities/useValidation';
import { ContainerResources } from '#~/types';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import ProjectScopedPopover from '#~/components/ProjectScopedPopover';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import { HARDWARE_PROFILE_SELECTION_HELP } from './const';
import { hardwareProfileValidationSchema } from './validationUtils';
import HardwareProfileSelect from './HardwareProfileSelect';
import HardwareProfileCustomize from './HardwareProfileCustomize';
import { PodSpecOptionsState, PodSpecOptions } from './types';
import { getContainerResourcesFromHardwareProfile } from './utils';

type HardwareProfileFormSectionProps<T extends PodSpecOptions> = {
  isEditing: boolean;
  project?: string;
  visibleIn?: HardwareProfileFeatureVisibility[];
  podSpecOptionsState: PodSpecOptionsState<T>;
  isHardwareProfileSupported?: (profile: HardwareProfileKind) => boolean;
};

const HardwareProfileFormSection: React.FC<HardwareProfileFormSectionProps<PodSpecOptions>> = ({
  podSpecOptionsState,
  project,
  isEditing,
  visibleIn = [],
  isHardwareProfileSupported = () => false,
}) => {
  const {
    hardwareProfile: { formData, initialHardwareProfile, setFormData },
  } = podSpecOptionsState;
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;

  const validation = useValidation(formData, hardwareProfileValidationSchema);
  const hasValidationErrors = Object.keys(validation.getAllValidationIssues()).length > 0;
  const [hardwareProfiles, loaded, error] = useHardwareProfilesByFeatureVisibility(visibleIn);
  const projectScopedHardwareProfiles = useHardwareProfilesByFeatureVisibility(visibleIn, project);

  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    if (initialHardwareProfile && hasValidationErrors) {
      setIsExpanded(true);
    }
  }, [initialHardwareProfile, hasValidationErrors]);

  const onProfileSelect = (profile?: HardwareProfileKind) => {
    // if no profile provided, use existing settings
    if (!profile) {
      setFormData('selectedProfile', undefined);
      setFormData('useExistingSettings', true);
      return;
    }

    // Reset customization when changing profiles
    const newResources = getContainerResourcesFromHardwareProfile(profile);

    setFormData('selectedProfile', profile);
    setFormData('useExistingSettings', false);
    setFormData('resources', newResources);
    const allKeys = new Set([
      ...Object.keys(newResources.requests || {}),
      ...Object.keys(newResources.limits || {}),
    ]);
    setFormData('uncheckedIdentifiers', {
      requests: Array.from(allKeys).reduce((acc: Record<string, boolean>, key) => {
        acc[key] = key in (newResources.requests || {});
        return acc;
      }, {}),
      limits: Array.from(allKeys).reduce((acc: Record<string, boolean>, key) => {
        acc[key] = key in (newResources.limits || {});
        return acc;
      }, {}),
    });
  };

  return (
    <ValidationContext.Provider value={validation}>
      <Stack hasGutter data-testid="hardware-profile-section">
        <StackItem>
          <FormGroup
            label="Hardware profile"
            isRequired
            labelHelp={
              isProjectScoped && project && projectScopedHardwareProfiles[0].length > 0 ? (
                <ProjectScopedPopover
                  title="Hardware profile"
                  item="hardware profiles"
                  description={HARDWARE_PROFILE_SELECTION_HELP}
                />
              ) : (
                <DashboardHelpTooltip content={HARDWARE_PROFILE_SELECTION_HELP} />
              )
            }
          >
            <HardwareProfileSelect
              isProjectScoped={isProjectScoped}
              hardwareProfileConfig={formData}
              previewDescription
              hardwareProfiles={hardwareProfiles}
              hardwareProfilesLoaded={loaded}
              hardwareProfilesError={error}
              projectScopedHardwareProfiles={
                !project ? [[], true, undefined] : projectScopedHardwareProfiles
              }
              isHardwareProfileSupported={isHardwareProfileSupported}
              initialHardwareProfile={initialHardwareProfile}
              onChange={onProfileSelect}
              allowExistingSettings={isEditing && !initialHardwareProfile}
              project={project}
            />
            <ZodErrorHelperText zodIssue={validation.getAllValidationIssues()} showAllErrors />
          </FormGroup>
        </StackItem>
        {formData.selectedProfile?.spec.identifiers &&
          formData.selectedProfile.spec.identifiers.length > 0 &&
          formData.resources && (
            <StackItem>
              <ExpandableSection
                isIndented
                toggleText="Customize resource requests and limits"
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
                data-testid="hardware-profile-customize"
              >
                <HardwareProfileCustomize
                  identifiers={formData.selectedProfile.spec.identifiers}
                  data={{
                    resources: formData.resources,
                    uncheckedIdentifiers: formData.uncheckedIdentifiers ?? {
                      requests: {},
                      limits: {},
                    },
                  }}
                  setData={(
                    newData: ContainerResources,
                    newUncheckedIdentifiers?: {
                      requests: { [key: string]: boolean };
                      limits: { [key: string]: boolean };
                    },
                  ) => {
                    console.log('🔧 HardwareProfileFormSection - setData called with:', {
                      newData,
                      newUncheckedIdentifiers,
                    });
                    setFormData('resources', newData);
                    setFormData('uncheckedIdentifiers', newUncheckedIdentifiers);
                    console.log('🔧 HardwareProfileFormSection - after setFormData, formData:', formData);
                  }}
                />
              </ExpandableSection>
            </StackItem>
          )}
      </Stack>
    </ValidationContext.Provider>
  );
};

export default HardwareProfileFormSection;
