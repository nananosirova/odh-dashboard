import * as React from 'react';
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Truncate,
} from '@patternfly/react-core';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import type { DRAHardwareProfileDetails } from './types';

type DRAHardwareProfileDetailsSectionProps = {
  details: DRAHardwareProfileDetails;
};

const DRAHardwareProfileDetailsSection: React.FC<DRAHardwareProfileDetailsSectionProps> = ({
  details,
}) => (
  <DescriptionList data-testid="hardware-profile-dra-details">
    <DescriptionListGroup>
      <DescriptionListTerm>
        Claim template{' '}
        <Label color="orange" variant="outline" isCompact>
          Tech Preview
        </Label>
      </DescriptionListTerm>
      <DescriptionListDescription>
        <ResourceNameTooltip
          resource={{
            apiVersion: 'resource.k8s.io/v1',
            kind: 'ResourceClaimTemplate',
            metadata: { name: details.resourceClaimTemplateName },
          }}
        >
          <div className="pf-v6-u-text-break-word" data-testid="hardware-profile-dra-template">
            {details.resourceClaimTemplateName}
          </div>
        </ResourceNameTooltip>
        {details.description && (
          <Content
            component="small"
            className="pf-v6-u-display-block"
            data-testid="hardware-profile-dra-description"
          >
            <Truncate
              content={details.description}
              data-testid="hardware-profile-dra-description-text"
            />
          </Content>
        )}
      </DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);

export default DRAHardwareProfileDetailsSection;
