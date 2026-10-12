import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import {
  k8sGetResource,
  k8sListResource,
  k8sListResourceItems,
  useK8sWatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockUseAssignHardwareProfileResult } from '@odh-dashboard/hardware-profiles/__mocks__/mockUseAssignHardwareProfileResult';
import { mockExtensions } from '../../../__tests__/mockUtils';
import { DeploymentRowExpandedSection } from '../row/DeploymentsTableRowExpandedSection';

jest.mock('@odh-dashboard/plugin-core');

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
  k8sListResourceItems: jest.fn(),
  useK8sWatchResource: jest.fn(),
}));

jest.mock('../../../../src/concepts/extensionUtils', () => ({
  useResolvedDeploymentExtension: () => [
    {
      properties: {
        extractModelFormat: () => ({ name: 'test-model-format' }),
        extractReplicas: () => ({ data: 1 }),
        hardwareProfilePaths: {
          containerResourcesPath: 'spec.predictor.model.resources',
          tolerationsPath: 'spec.predictor.tolerations',
          nodeSelectorPath: 'spec.predictor.nodeSelector',
        },
        extractModelAvailabilityData: () => ({
          saveAsAiAsset: true,
          useCase: 'test-use-case',
        }),
      },
    },
  ],
}));

const mockUseAssignHardwareProfile = jest.fn();
jest.mock('@odh-dashboard/hardware-profiles/shared', () => {
  const { HardwareProfileFeatureVisibility } = jest.requireActual('@odh-dashboard/k8s-core');
  return {
    MODEL_SERVING_VISIBILITY: [HardwareProfileFeatureVisibility.MODEL_SERVING],
    useAssignHardwareProfile: (...args: unknown[]) => mockUseAssignHardwareProfile(...args),
  };
});

const mockUseWizardFieldExtractors = jest.fn();
jest.mock('../../deploymentWizard/useWizardFieldExtractors', () => ({
  useWizardFieldExtractors: (...args: unknown[]) => mockUseWizardFieldExtractors(...args),
}));

const mockDeployment = () => ({
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'v1',
    kind: 'TestModelKind',
    metadata: {
      name: 'test-deployment',
      namespace: 'test-project',
      annotations: {
        'openshift.io/description': 'test-description',
      },
    },
  },
});
const hardwareProfilePaths = {
  containerResourcesPath: 'spec.predictor.model.resources',
  tolerationsPath: 'spec.predictor.tolerations',
  nodeSelectorPath: 'spec.predictor.nodeSelector',
};

describe('DeploymentsTableRowExpandedSection', () => {
  beforeEach(() => {
    mockExtensions();
    mockUseAssignHardwareProfile.mockReturnValue(
      mockUseAssignHardwareProfileResult({
        selectedHardwareProfile: mockHardwareProfile({ displayName: 'test-profile' }),
      }),
    );
    mockUseWizardFieldExtractors.mockReturnValue({
      extractedFieldData: { 'maas/save-as-maas-checkbox': { isChecked: true } },
      extractorsLoaded: true,
      extractorErrors: [],
    });
  });

  afterEach(() => {
    mockUseAssignHardwareProfile.mockReset();
    mockUseWizardFieldExtractors.mockReset();
  });
  it('should render the expanded row with correct data', () => {
    render(
      <DeploymentRowExpandedSection
        deployment={mockDeployment()}
        isVisible
        hardwareProfilePaths={hardwareProfilePaths}
      />,
    );
    // description
    expect(screen.getByText('test-description')).toBeInTheDocument();
    // model format
    expect(screen.getByText('test-model-format')).toBeInTheDocument();
    // replicas
    expect(screen.getByText('1')).toBeInTheDocument();
    // hardware profile
    expect(screen.getByText('test-profile')).toBeInTheDocument();
    // model availability
    expect(screen.getByText('AI asset endpoint, Model-as-a-Service (MaaS)')).toBeInTheDocument();
    // use case
    expect(screen.getByText('test-use-case')).toBeInTheDocument();
  });
});

describe('DeploymentsTableRowExpandedSection — DRA claim template', () => {
  const dra = { resourceClaimTemplateName: 'single-mig-partition' };
  const descriptionAnnotation = 'opendatahub.io/resource-claim-description';

  const mockDRAProfile = (profileOptions?: Parameters<typeof mockHardwareProfile>[0]) =>
    mockHardwareProfile({ displayName: 'DRA Profile', dra, ...profileOptions });

  const renderSection = (
    selectedHardwareProfile?: ReturnType<typeof mockHardwareProfile>,
    loadState: { profilesLoaded?: boolean; profilesLoadError?: Error } = {},
  ) => {
    const result = mockUseAssignHardwareProfileResult({ selectedHardwareProfile });
    mockUseAssignHardwareProfile.mockReturnValue({
      ...result,
      podSpecOptionsState: {
        ...result.podSpecOptionsState,
        hardwareProfile: { ...result.podSpecOptionsState.hardwareProfile, ...loadState },
      },
    });
    return render(
      <DeploymentRowExpandedSection
        deployment={mockDeployment()}
        isVisible
        hardwareProfilePaths={hardwareProfilePaths}
      />,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtensions();
    mockUseWizardFieldExtractors.mockReturnValue({
      extractedFieldData: { 'maas/save-as-maas-checkbox': { isChecked: true } },
      extractorsLoaded: true,
      extractorErrors: [],
    });
  });

  afterEach(() => {
    mockUseAssignHardwareProfile.mockReset();
    mockUseWizardFieldExtractors.mockReset();
  });

  it('should show the claim template and description of the DRA hardware profile', () => {
    renderSection(
      mockDRAProfile({
        annotations: {
          [descriptionAnnotation]: 'Requests one partitioned GPU device for the workload.',
        },
      }),
    );

    const draDetails = screen.getByTestId('hardware-profile-dra-details');
    expect(draDetails).not.toHaveTextContent('Device requests');
    expect(draDetails).toHaveTextContent('Tech Preview');
    expect(draDetails).toHaveTextContent('Claim template');
    expect(draDetails).not.toHaveTextContent('ResourceClaimTemplate');
    expect(within(draDetails).getByTestId('hardware-profile-dra-template')).toHaveTextContent(
      'single-mig-partition',
    );
    expect(within(draDetails).getByTestId('hardware-profile-dra-description')).toHaveTextContent(
      'Requests one partitioned GPU device for the workload.',
    );
    expect(screen.getByTestId('hardware-section')).toHaveTextContent('DRA Profile');
    expect(screen.getByText('Model server size')).toBeInTheDocument();
  });

  it.each([
    ['missing', undefined],
    ['empty', { [descriptionAnnotation]: '' }],
    ['whitespace-only', { [descriptionAnnotation]: '  \n\t  ' }],
  ])('should omit the description when the annotation is %s', (_, annotations) => {
    renderSection(mockDRAProfile({ annotations }));

    const draDetails = screen.getByTestId('hardware-profile-dra-details');
    expect(within(draDetails).getByTestId('hardware-profile-dra-template')).toHaveTextContent(
      'single-mig-partition',
    );
    expect(
      within(draDetails).queryByTestId('hardware-profile-dra-description'),
    ).not.toBeInTheDocument();
  });

  it('should show DRA details for a DRA hardware profile without identifiers', () => {
    renderSection(mockDRAProfile({ identifiers: [] }));

    expect(
      within(screen.getByTestId('hardware-profile-dra-details')).getByTestId(
        'hardware-profile-dra-template',
      ),
    ).toHaveTextContent('single-mig-partition');
  });

  it('should not show DRA details while hardware profiles are loading', () => {
    renderSection(mockDRAProfile(), { profilesLoaded: false });

    expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
    expect(screen.getByTestId('hardware-section')).toHaveTextContent('Loading...');
  });

  it('should not show DRA details when hardware profiles fail to load', () => {
    renderSection(mockDRAProfile(), { profilesLoadError: new Error('load failed') });

    expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
    expect(screen.getByTestId('hardware-section')).toHaveTextContent('Unknown');
  });

  it('should not show DRA details when no hardware profile is assigned', () => {
    renderSection();

    expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
    expect(screen.getByTestId('hardware-section')).toHaveTextContent('Unknown');
  });

  it('should not show DRA details for a non-DRA hardware profile', () => {
    renderSection(
      mockHardwareProfile({
        displayName: 'Plain Profile',
        annotations: { [descriptionAnnotation]: 'Ignored without spec.dra' },
      }),
    );

    expect(screen.queryByTestId('hardware-profile-dra-details')).not.toBeInTheDocument();
    expect(screen.queryByText('Device requests')).not.toBeInTheDocument();
    expect(screen.getByTestId('hardware-section')).toHaveTextContent('Plain Profile');
  });

  it('should not fetch the ResourceClaimTemplate or any ResourceClaim', () => {
    renderSection(mockDRAProfile({ annotations: { [descriptionAnnotation]: 'Some description' } }));

    expect(screen.getByTestId('hardware-profile-dra-details')).toBeInTheDocument();
    expect(k8sGetResource).not.toHaveBeenCalled();
    expect(k8sListResource).not.toHaveBeenCalled();
    expect(k8sListResourceItems).not.toHaveBeenCalled();
    expect(useK8sWatchResource).not.toHaveBeenCalled();
  });
});
