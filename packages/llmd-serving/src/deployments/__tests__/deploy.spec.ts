import type { ContainerResources, PodSpec } from '@odh-dashboard/k8s-core';
import type { HardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import {
  ModelLocationType,
  type WizardFormData,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import type { LLMdDeployment, LLMInferenceServiceKind } from '../../types';
import { assembleLLMdDeployment } from '../deploy';

const resourceClaims: PodSpec['resourceClaims'] = [
  { name: 'hwp-dra', resourceClaimTemplateName: 'single-gpu' },
];

const draResources: ContainerResources = {
  requests: { cpu: '1', memory: '2Gi' },
  limits: { cpu: '1', memory: '2Gi' },
  claims: [{ name: 'hwp-dra' }],
};

const draHardwareProfileConfig = (): HardwareProfileConfig => ({
  selectedProfile: mockHardwareProfile({
    name: 'dra-profile',
    namespace: 'opendatahub',
    resourceVersion: '2000',
    dra: { resourceClaimTemplateName: 'single-gpu' },
  }),
  useExistingSettings: false,
  resources: draResources,
});

const wizardData = (hardwareProfile: HardwareProfileConfig) =>
  ({
    state: {
      project: { projectName: 'test-project' },
      k8sNameDesc: {
        data: {
          name: 'Test LLM Inference Service',
          description: '',
          k8sName: { value: 'test-llm-inference-service' },
        },
      },
      hardwareProfileConfig: { formData: hardwareProfile },
      modelLocationData: {
        data: { type: ModelLocationType.NEW, fieldValues: {}, additionalFields: {} },
      },
      createConnectionData: { data: {} },
      numReplicas: { data: 1 },
      runtimeArgs: { data: undefined },
      environmentVariables: { data: undefined },
      modelAvailability: { data: undefined },
      tokenAuthentication: { data: [] },
      modelServer: { data: undefined },
      deploymentMethod: undefined,
    },
  } as unknown as WizardFormData);

const existingDRADeployment = (annotations: Record<string, string>): LLMdDeployment => {
  const model: LLMInferenceServiceKind = mockLLMInferenceServiceK8sResource({
    additionalAnnotations: annotations,
    resourceClaims,
  });
  if (model.spec.template?.containers?.[0]) {
    model.spec.template.containers[0].resources = draResources;
  }
  return { modelServingPlatformId: 'llmd-serving', model };
};

describe('assembleLLMdDeployment', () => {
  it('should keep the resource claims and the resource version when the same DRA hardware profile stays selected', () => {
    const existingDeployment = existingDRADeployment({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });

    const { model } = assembleLLMdDeployment(
      wizardData(draHardwareProfileConfig()),
      existingDeployment,
    );

    expect(model.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });
    expect(model.spec.template?.resourceClaims).toStrictEqual(resourceClaims);
    expect(model.spec.template?.containers?.[0].resources?.claims).toStrictEqual(
      draResources.claims,
    );
  });

  it('should write the resource version and keep the resource claims when a DRA hardware profile is newly selected', () => {
    const existingDeployment = existingDRADeployment({
      'opendatahub.io/hardware-profile-resource-version': '1000',
    });

    const { model } = assembleLLMdDeployment(
      wizardData(draHardwareProfileConfig()),
      existingDeployment,
    );

    expect(model.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '2000',
    });
    expect(model.spec.template?.resourceClaims).toStrictEqual(resourceClaims);
    expect(model.spec.template?.containers?.[0].resources).toStrictEqual(draResources);
  });

  it('should write the resource version when a new deployment uses a DRA hardware profile', () => {
    const { model } = assembleLLMdDeployment(wizardData(draHardwareProfileConfig()));

    expect(model.metadata.annotations).toMatchObject({
      'opendatahub.io/hardware-profile-name': 'dra-profile',
      'opendatahub.io/hardware-profile-namespace': 'opendatahub',
      'opendatahub.io/hardware-profile-resource-version': '2000',
    });
    expect(model.spec.template?.containers?.[0].resources).toStrictEqual(draResources);
  });
});
