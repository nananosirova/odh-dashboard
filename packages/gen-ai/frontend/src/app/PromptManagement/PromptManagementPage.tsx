import * as React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import { Bullseye, Button, Content, Flex, FlexItem, PageSection, Spinner, Title } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from 'mod-arch-shared';
import { useMlflowPathSync } from '@odh-dashboard/internal/pages/pipelines/global/mlflowExperiments/useMlflowPathSync';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import GenAiCoreProjectSelector from '~/app/GenAiCoreProjectSelector';
import GenAiCoreNoProjects from '~/app/GenAiCoreNoProjects';
import GenAiCoreInvalidProject from '~/app/GenAiCoreInvalidProject';
import {
  genAiPromptManagementRoute,
  promptManagementRootPath,
  PROMPT_MANAGEMENT_DEFAULT_PATH,
  PROMPT_MANAGEMENT_WORKSPACE_PARAM,
} from '~/app/utilities/routes';

const PromptManagementIframe: React.FC<{ namespace: string }> = ({ namespace }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const iframeContainerRef = React.useRef<HTMLDivElement>(null);
  const [iframeHeight, setIframeHeight] = React.useState<string | undefined>(undefined);

  const { iframeRef, initIframeSrc } = useMlflowPathSync({
    baseRoute: promptManagementRootPath,
    defaultPath: PROMPT_MANAGEMENT_DEFAULT_PATH,
  });

  React.useEffect(() => {
    const findScrollableParent = (el: HTMLElement): HTMLElement | null => {
      let parent = el.parentElement;
      while (parent) {
        const { overflowY } = getComputedStyle(parent);
        if (overflowY === 'auto' || overflowY === 'scroll') {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    };

    const updateHeight = () => {
      if (iframeContainerRef.current) {
        const containerTop = iframeContainerRef.current.getBoundingClientRect().top;
        const scrollParent = findScrollableParent(iframeContainerRef.current);
        const bottomEdge = scrollParent
          ? scrollParent.getBoundingClientRect().bottom
          : window.innerHeight;
        setIframeHeight(`${bottomEdge - containerTop}px`);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <ApplicationsPage
      title={
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
          <FlexItem>
            <Title headingLevel="h1" data-testid="page-title">
              Prompt management
            </Title>
          </FlexItem>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
              <ProjectIconWithSize size={IconSize.LG} />
              <FlexItem>
                <Content component="p">Project</Content>
              </FlexItem>
              <FlexItem>
                <GenAiCoreProjectSelector
                  namespace={namespace}
                  getRedirectPath={genAiPromptManagementRoute}
                />
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      }
      headerAction={
        <Button
          component="a"
          isInline
          data-testid="mlflow-prompts-jump-link"
          href="/mlflow"
          target="_blank"
          variant="link"
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
          aria-label="Launch MLflow"
          style={{ whiteSpace: 'nowrap' }}
        >
          Launch MLflow
        </Button>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} style={{ paddingBlock: 0, overflow: 'hidden' }}>
        <div ref={iframeContainerRef}>
          {isLoading && (
            <Bullseye>
              <Spinner />
            </Bullseye>
          )}
          <iframe
            ref={iframeRef}
            title="MLflow Prompt Management"
            src={initIframeSrc}
            data-testid="mlflow-prompts-iframe"
            style={{
              width: '100%',
              height: iframeHeight ?? '100vh',
              border: 'none',
              display: isLoading ? 'none' : 'block',
            }}
            onLoad={() => {
              setIsLoading(false);
            }}
          />
        </div>
      </PageSection>
    </ApplicationsPage>
  );
};

const PromptManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const namespace = searchParams.get(PROMPT_MANAGEMENT_WORKSPACE_PARAM);
  const { namespaces, namespacesLoaded, preferredNamespace } = useNamespaceSelector();

  if (!namespacesLoaded) {
    return (
      <ApplicationsPage title="Prompt management" loaded={false} empty={false} />
    );
  }

  if (namespaces.length === 0) {
    return (
      <ApplicationsPage title="Prompt management" loaded empty emptyStatePage={<GenAiCoreNoProjects />} />
    );
  }

  if (!namespace) {
    const redirectNamespace = preferredNamespace ?? namespaces[0];
    return <Navigate to={genAiPromptManagementRoute(redirectNamespace.name)} replace />;
  }

  const foundProject = namespaces.find((n) => n.name === namespace);
  if (!foundProject) {
    return (
      <ApplicationsPage
        title="Prompt management"
        loaded
        empty
        emptyStatePage={
          <GenAiCoreInvalidProject namespace={namespace} getRedirectPath={genAiPromptManagementRoute} />
        }
      />
    );
  }

  return <PromptManagementIframe namespace={namespace} />;
};

export default PromptManagementPage;
