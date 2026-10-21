import type { ContainerResources, PodSpec } from '@odh-dashboard/k8s-core';
import type { HardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { assembleInferenceService, type CreatingInferenceServiceObject } from '../deployModel';

const resourceClaims: PodSpec['resourceClaims'] = [
  { name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' },
];

const draResources: ContainerResources = {
  requests: { cpu: '1', memory: '2Gi' },
  limits: { cpu: '1', memory: '2Gi' },
  claims: [{ name: 'hwp-dra' }],
};

const draProfile = () =>
  mockHardwareProfile({
    name: 'dra-profile',
    namespace: 'opendatahub',
    resourceVersion: '2000',
    dra: { resourceClaimTemplateName: 'single-gpu' },
  });

const creatingData = (hardwareProfile: HardwareProfileConfig): CreatingInferenceServiceObject => ({
  project: 'test-project',
  name: 'Test Inference Service',
  k8sName: 'test-inference-service',
  description: '',
  hardwareProfile,
});

const draHardwareProfileConfig = (): HardwareProfileConfig => ({
  selectedProfile: draProfile(),
  useExistingSettings: false,
  resources: draResources,
});

describe('assembleInferenceService', () => {
  it('should keep the resource claims and the resource version when the same DRA hardware profile stays selected', () => {
    const existingInferenceService = mockInferenceServiceK8sResource({
      hardwareProfileName: 'dra-profile',
      hardwareProfileNamespace: 'opendatahub',
      hardwareProfileResourceVersion: '1000',
      resourceClaims,
      resources: draResources,
    });

    const result = assembleInferenceService(
      creatingData(draHardwareProfileConfig()),
      existingInferenceService,
    );

    expect(result.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
    expect(result.spec.predictor.resourceClaims).toStrictEqual(resourceClaims);
    expect(result.spec.predictor.model?.resources?.claims).toStrictEqual(draResources.claims);
  });

  it('should write the resource version and keep the resource claims when a DRA hardware profile is newly selected', () => {
    const existingInferenceService = mockInferenceServiceK8sResource({
      hardwareProfileName: 'small-profile',
      hardwareProfileNamespace: 'opendatahub',
      hardwareProfileResourceVersion: '1000',
      resourceClaims,
      resources: draResources,
    });

    const result = assembleInferenceService(
      creatingData(draHardwareProfileConfig()),
      existingInferenceService,
    );

    expect(result.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '2000',
    });
    expect(result.spec.predictor.resourceClaims).toStrictEqual(resourceClaims);
    expect(result.spec.predictor.model?.resources).toStrictEqual(draResources);
  });

  it('should write the resource version when a new deployment uses a DRA hardware profile', () => {
    const result = assembleInferenceService(creatingData(draHardwareProfileConfig()));

    expect(result.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '2000',
    });
    expect(result.spec.predictor.model?.resources).toStrictEqual(draResources);
  });
});
