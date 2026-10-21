import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import type { ContainerResources, HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useHardwareProfilesByFeatureVisibility } from '@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '@odh-dashboard/hardware-profiles/shared/kueueUtils';
import { useResourceClaimTemplateNames } from '@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames';
import type { HardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig';
import { DEFAULT_LIST_FETCH_STATE } from '@odh-dashboard/ui-core/utilities/fetchState';
import { CurrentProjectContext } from '@odh-dashboard/ui-core/context/CurrentProjectContext';
import { LocalQueuesContext } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import HardwareProfileFormSection from '#~/concepts/hardwareProfiles/HardwareProfileFormSection';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility', () => ({
  useHardwareProfilesByFeatureVisibility: jest.fn(),
}));

jest.mock('@odh-dashboard/hardware-profiles/shared/kueueUtils', () => ({
  ...jest.requireActual('@odh-dashboard/hardware-profiles/shared/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

jest.mock('@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames', () => ({
  useResourceClaimTemplateNames: jest.fn(),
}));

const useIsAreaAvailableMock = jest.mocked(useIsAreaAvailable);
const useHardwareProfilesByFeatureVisibilityMock = jest.mocked(
  useHardwareProfilesByFeatureVisibility,
);
const useKueueConfigurationMock = jest.mocked(useKueueConfiguration);
const useResourceClaimTemplateNamesMock = jest.mocked(useResourceClaimTemplateNames);

const regularProfile = () =>
  mockHardwareProfile({ name: 'regular-profile', displayName: 'Regular Profile' });

const draProfile = () =>
  mockHardwareProfile({
    name: 'dra-profile',
    displayName: 'DRA Profile',
    dra: { resourceClaimTemplateName: 'single-gpu' },
  });

const draWorkloadResources = (): ContainerResources => ({
  requests: { cpu: '4', memory: '8Gi' },
  limits: { cpu: '4', memory: '8Gi' },
  claims: [{ name: 'hwp-dra' }],
});

const renderFormSection = ({
  hardwareProfiles,
  formData,
  initialHardwareProfile,
  initialResources,
}: {
  hardwareProfiles: HardwareProfileKind[];
  formData: HardwareProfileConfig;
  initialHardwareProfile?: HardwareProfileKind;
  initialResources?: ContainerResources;
}) => {
  const setFormData = jest.fn();
  useHardwareProfilesByFeatureVisibilityMock.mockReturnValue({
    globalProfiles: [hardwareProfiles, true, undefined],
    projectProfiles: [[], true, undefined],
  });
  const project = mockProjectK8sResource({});

  render(
    <CurrentProjectContext.Provider value={{ currentProject: project }}>
      <ProjectsContext.Provider
        value={{
          projects: [project],
          modelServingProjects: [],
          nonActiveProjects: [],
          preferredProject: null,
          updatePreferredProject: () => undefined,
          loaded: true,
          loadError: undefined,
          waitForProject: () => Promise.resolve(),
        }}
      >
        <LocalQueuesContext.Provider value={{ localQueues: DEFAULT_LIST_FETCH_STATE }}>
          <HardwareProfileFormSection
            isEditing
            isHardwareProfileSupported={() => true}
            podSpecOptionsState={{
              hardwareProfile: {
                formData,
                initialHardwareProfile,
                initialResources,
                setFormData,
                resetFormData: jest.fn(),
                isFormDataValid: true,
                profilesLoaded: true,
              },
              podSpecOptions: { resources: formData.resources },
            }}
          />
        </LocalQueuesContext.Provider>
      </ProjectsContext.Provider>
    </CurrentProjectContext.Provider>,
  );

  return setFormData;
};

describe('HardwareProfileFormSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsAreaAvailableMock.mockReturnValue({ status: false } as ReturnType<
      typeof useIsAreaAvailable
    >);
    useKueueConfigurationMock.mockReturnValue({
      isKueueDisabled: false,
      isKueueFeatureEnabled: true,
      isProjectKueueEnabled: false,
      kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
    });
    useResourceClaimTemplateNamesMock.mockReturnValue({ status: 'unavailable' });
  });

  it('should carry the existing claims to the defaults of a newly selected profile', async () => {
    const dra = draProfile();
    const regular = regularProfile();
    const setFormData = renderFormSection({
      hardwareProfiles: [dra, regular],
      formData: {
        selectedProfile: dra,
        useExistingSettings: false,
        resources: draWorkloadResources(),
      },
      initialHardwareProfile: dra,
      initialResources: draWorkloadResources(),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));
    await userEvent.click(screen.getByRole('option', { name: /Regular Profile/ }));

    expect(setFormData.mock.calls).toStrictEqual([
      ['selectedProfile', regular],
      ['useExistingSettings', false],
      [
        'resources',
        {
          requests: { memory: '2Gi', cpu: '1' },
          limits: { memory: '2Gi', cpu: '1' },
          claims: [{ name: 'hwp-dra' }],
        },
      ],
    ]);
  });

  it('should restore the initial resources when the initial DRA profile is selected again', async () => {
    const dra = draProfile();
    const regular = regularProfile();
    const initialResources = draWorkloadResources();
    const setFormData = renderFormSection({
      hardwareProfiles: [dra, regular],
      formData: {
        selectedProfile: regular,
        useExistingSettings: false,
        resources: {
          requests: { memory: '2Gi', cpu: '1' },
          limits: { memory: '2Gi', cpu: '1' },
          claims: [{ name: 'hwp-dra' }],
        },
      },
      initialHardwareProfile: dra,
      initialResources,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));
    await userEvent.click(screen.getByRole('option', { name: /DRA Profile/ }));

    expect(setFormData.mock.calls).toStrictEqual([
      ['selectedProfile', dra],
      ['useExistingSettings', false],
      ['resources', initialResources],
    ]);
    expect(setFormData.mock.calls[2][1]).toBe(initialResources);
  });

  it('should use the existing settings when no profile is selected', async () => {
    const regular = regularProfile();
    const setFormData = renderFormSection({
      hardwareProfiles: [regular, draProfile()],
      formData: {
        selectedProfile: regular,
        useExistingSettings: false,
        resources: {
          requests: { memory: '2Gi', cpu: '1' },
          limits: { memory: '2Gi', cpu: '1' },
        },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));
    await userEvent.click(screen.getByRole('option', { name: /Use existing settings/ }));

    expect(setFormData.mock.calls).toStrictEqual([
      ['selectedProfile', undefined],
      ['useExistingSettings', true],
    ]);
  });
});
