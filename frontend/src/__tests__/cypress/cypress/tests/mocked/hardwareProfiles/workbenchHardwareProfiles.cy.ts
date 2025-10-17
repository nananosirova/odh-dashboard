import { info } from 'console';
import {
  mockGlobalScopedHardwareProfiles,
  mockHardwareProfile,
  mockProjectScopedHardwareProfiles,
} from '#~/__mocks__/mockHardwareProfile';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import {
  HardwareProfileModel,
  ImageStreamModel,
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  StorageClassModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { ProfileIdentifierType } from '#~/concepts/hardwareProfiles/types';
import {
  mock403ErrorWithDetails,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockStorageClassList,
} from '#~/__mocks__';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  editSpawnerPage,
  createSpawnerPage,
} from '#~/__tests__/cypress/cypress/pages/workbench';
import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import type { PodKind } from '#~/k8sTypes';

type HandlersProps = {
  isEmpty?: boolean;
  mockPodList?: PodKind[];
  disableProjectScoped?: boolean;
};

const initIntercepts = ({
  isEmpty = false,
  mockPodList = [mockPodK8sResource({})],
  disableProjectScoped = true,
}: HandlersProps = {}) => {
  asProductAdminUser();

  // Mock hardware profiles
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  ).as('hardwareProfiles');

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'test-project' },
    mockK8sResourceList(mockProjectScopedHardwareProfiles),
  ).as('hardwareProfiles');

  // Mock standard resources similar to workbench.cy.ts
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        workbenches: true,
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableProjectScoped,
    }),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptK8sList(PodModel, mockK8sResourceList(mockPodList));
  cy.interceptK8sList(
    ImageStreamModel,
    mockK8sResourceList([
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
      }),
    ]),
  );
  cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' }));
  cy.interceptK8sList(
    {
      model: NotebookModel,
      ns: 'test-project',
    },
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockNotebookK8sResource({
              displayName: 'Test Notebook',
            }),
          ],
    ),
  );
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8sList(
    PVCModel,
    mockK8sResourceList([mockPVCK8sResource({ name: 'test-storage-1' })]),
  );
};

describe('Workbench Hardware Profiles', () => {
  const projectName = 'test-project';

  it('should display hardware profile selection in workbench creation without setting a feature flag', () => {
    initIntercepts();
    // debugger;
    // Navigate to workbench creation
    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage.findCreateButton().click();

    // wait for hardware profile select to be loaded in
    cy.wait('@hardwareProfiles');

    // Verify hardware profile section exists
    hardwareProfileSection.findSelect().should('exist');

    // Verify available profiles
    hardwareProfileSection.selectProfile(
      'Small Profile CPU: Request = 1 Cores; Limit = 1 Cores; Memory: Request = 2 GiB; Limit = 2 GiB',
    );
    hardwareProfileSection.selectProfile(
      'Large Profile CPU: Request = 4 Cores; Limit = 4 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
    );
  });

  it('should display and select project-scoped hardware and global-scoped hardware profiles while creating a workbench', () => {
    initIntercepts({ disableProjectScoped: false });

    cy.interceptK8sList(
      {
        model: NotebookModel,
        ns: 'test-project',
      },
      mockK8sResourceList([
        mockNotebookK8sResource({
          hardwareProfileName: 'large-profile-1',
          displayName: 'Test Notebook',
        }),
      ]),
    );

    // Navigate to workbench creation
    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage.findCreateButton().click();

    // wait for hardware profile select to be loaded in
    cy.wait('@hardwareProfiles');

    // Verify hardware profile section exists
    hardwareProfileSection.findHardwareProfileSearchSelector().should('exist');
    hardwareProfileSection.findHardwareProfileSearchSelector().click();

    // Verify both groups are initially visible
    cy.contains('Project-scoped hardware profiles').should('be.visible');
    cy.contains('Global-scoped hardware profiles').scrollIntoView();
    cy.contains('Global-scoped hardware profiles').should('be.visible');

    // Search for a value that exists in Project-scoped hardware profiles but not in Global-scoped hardware profiles
    hardwareProfileSection
      .findHardwareProfileSearchInput()
      .should('be.visible')
      .type('Large Profile-1');

    // Wait for and verify the groups are visible
    cy.contains('Large Profile-1').should('be.visible');
    hardwareProfileSection.getGlobalHardwareProfileLabel().should('not.exist');

    //Search for a value that doesn't exist in either Global-scoped hardware profiles or Project-scoped hardware profiles
    hardwareProfileSection
      .findHardwareProfileSearchInput()
      .should('be.visible')
      .clear()
      .type('sample');

    // Wait for and verify that no results are found
    cy.contains('No results found').should('be.visible');
    hardwareProfileSection.getGlobalHardwareProfileLabel().should('not.exist');
    hardwareProfileSection.getProjectScopedHardwareProfileLabel().should('not.exist');
    hardwareProfileSection.findHardwareProfileSearchInput().should('be.visible').clear();
  });

  it('should display hardware profile selection in workbench creation when both hardware profile and project-scoped feature flag is enabled', () => {
    initIntercepts({ disableProjectScoped: false });

    // Navigate to workbench creation
    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage.findCreateButton().click();

    // wait for hardware profile select to be loaded in
    cy.wait('@hardwareProfiles');

    // Verify hardware profile section exists
    hardwareProfileSection.findHardwareProfileSearchSelector().should('exist');
    hardwareProfileSection.findHardwareProfileSearchSelector().click();

    // verify available project-scoped hardware profile
    const projectScopedHardwareProfile = hardwareProfileSection.getProjectScopedHardwareProfile();
    projectScopedHardwareProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile CPU: Request = 1; Limit = 1; Memory: Request = 2Gi; Limit = 2Gi',
        hidden: true,
      })
      .click();
    hardwareProfileSection.findProjectScopedLabel().should('exist');

    // verify available global-scoped hardware profile
    hardwareProfileSection.findHardwareProfileSearchSelector().click();
    const globalScopedHardwareProfile = hardwareProfileSection.getGlobalScopedHardwareProfile();
    globalScopedHardwareProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile CPU: Request = 1; Limit = 1; Memory: Request = 2Gi; Limit = 2Gi',
        hidden: true,
      })
      .click();
    hardwareProfileSection.findGlobalScopedLabel().should('exist');
  });

  it('should have project scoped label on table row', () => {
    initIntercepts({ disableProjectScoped: false });

    // Mock notebook with hardware profile annotation
    cy.interceptK8sList(
      {
        model: NotebookModel,
        ns: 'test-project',
      },
      mockK8sResourceList([
        mockNotebookK8sResource({
          hardwareProfileName: 'large-profile-1',
          displayName: 'Test Notebook',
          hardwareProfileNamespace: 'test-project',
        }),
      ]),
    );

    // Mock the individual hardware profile resource fetch
    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'test-project',
        name: 'large-profile-1',
      },
      mockHardwareProfile({
        name: 'large-profile-1',
        displayName: 'Large Profile-1',
        namespace: 'test-project',
      }),
    );

    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage
      .getNotebookRow('Test Notebook')
      .find()
      .findByText('Large Profile-1')
      .should('exist');
    workbenchPage.getNotebookRow('Test Notebook').findProjectScopedLabel().should('exist');
  });

  it('should validate hardware profile customization within limits', () => {
    initIntercepts();
    // Navigate to workbench creation
    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage.findCreateButton().click();

    // Select profile and open customization
    hardwareProfileSection.selectProfile(
      'Large Profile CPU: Request = 4 Cores; Limit = 4 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
    );
    hardwareProfileSection.findCustomizeButton().click();

    // Test CPU validation
    hardwareProfileSection.verifyResourceValidation(
      'cpu-requests',
      '3',
      'Must be at least 4 Cores',
    );
    hardwareProfileSection.verifyResourceValidation('cpu-requests', '9', 'Must not exceed 8 Cores');
    hardwareProfileSection.verifyResourceValidation('cpu-requests', '6');
    hardwareProfileSection.verifyResourceValidation(
      'cpu-limits',
      '5',
      'Limit must be greater than or equal to request',
    );

    // Test Memory validation
    hardwareProfileSection.verifyResourceValidation(
      'memory-requests',
      '1',
      'Must be at least 8 GiB',
    );

    hardwareProfileSection.verifyResourceValidation(
      'memory-requests',
      '17',
      'Must not exceed 16 GiB',
    );
  });

  describe('Edit Workbench Hardware Profiles', () => {
    it('should auto-select hardware profile from annotations', () => {
      initIntercepts();
      // Mock notebook with hardware profile annotation
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'small-profile',
            displayName: 'Test Notebook',
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      hardwareProfileSection.findSelect().should('contain.text', 'Small Profile');
    });

    it('should auto-select project-scoped hardware profile from annotations', () => {
      initIntercepts({
        disableProjectScoped: false,
      });

      // Mock notebook with hardware profile annotation
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'large-profile-1',
            displayName: 'Test Notebook',
            hardwareProfileNamespace: 'test-project',
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      hardwareProfileSection
        .findHardwareProfileSearchSelector()
        .should('contain.text', 'Large Profile-1');
      hardwareProfileSection.findProjectScopedLabel().should('exist');
    });

    it('should auto-select disabled hardware profile from annotations and show disabled state', () => {
      initIntercepts();
      // Mock disabled hardware profile
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({
            name: 'small-profile',
            displayName: 'Small Profile',
            annotations: { 'opendatahub.io/disabled': 'true' },
            identifiers: [
              {
                displayName: 'CPU',
                identifier: 'cpu',
                minCount: '1',
                maxCount: '2',
                defaultCount: '1',
              },
              {
                displayName: 'Memory',
                identifier: 'memory',
                minCount: '2Gi',
                maxCount: '4Gi',
                defaultCount: '2Gi',
              },
            ],
          }),
        ]),
      );

      // Mock notebook with disabled hardware profile annotation
      cy.interceptK8sList(
        NotebookModel,
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'small-profile',
            displayName: 'Test Notebook',
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      editSpawnerPage.findAlertMessage().should('not.exist');
      hardwareProfileSection.findSelect().should('contain.text', 'Small Profile (disabled)');
    });

    it('should auto-select matching hardware profile when resources match', () => {
      initIntercepts();
      // Mock notebook with matching resources but no hardware profile annotation
      cy.interceptK8sList(
        NotebookModel,
        mockK8sResourceList([
          mockNotebookK8sResource({
            opts: {
              metadata: {
                name: 'test-notebook',
                annotations: {
                  'openshift.io/display-name': 'Test Notebook',
                },
              },
              spec: {
                template: {
                  spec: {
                    containers: [
                      {
                        name: 'test-notebook',
                        resources: {
                          requests: {
                            cpu: '1',
                            memory: '2Gi',
                          },
                          limits: {
                            cpu: '1',
                            memory: '2Gi',
                          },
                        },
                      },
                    ],
                    tolerations: [],
                    nodeSelector: {},
                  },
                },
              },
            },
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      editSpawnerPage.findAlertMessage().should('not.exist');
      hardwareProfileSection.findSelect().should('contain.text', 'Small Profile');
      hardwareProfileSection.findSelect().click();
      cy.findByRole('option', { name: 'Use existing settings' }).should('not.exist');
    });

    it('should auto-select "Use existing settings" when resources do not match any profile', () => {
      initIntercepts();
      // Mock notebook with non-matching resources and no hardware profile annotation
      cy.interceptK8sList(
        NotebookModel,
        mockK8sResourceList([
          mockNotebookK8sResource({
            opts: {
              metadata: {
                name: 'test-notebook',
                annotations: {
                  'openshift.io/display-name': 'Test Notebook',
                },
              },
              spec: {
                template: {
                  spec: {
                    containers: [
                      {
                        name: 'test-notebook',
                        resources: {
                          requests: {
                            cpu: '10',
                            memory: '6Gi',
                          },
                          limits: {
                            cpu: '10',
                            memory: '6Gi',
                          },
                        },
                      },
                    ],
                    tolerations: [
                      {
                        key: 'some-new-key',
                      },
                    ],
                    nodeSelector: {},
                  },
                },
              },
            },
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      editSpawnerPage.findAlertMessage().should('not.exist');
      hardwareProfileSection.findSelect().should('contain.text', 'Use existing settings');
    });
  });

  describe('Hardware Profile Dropdown Ordering', () => {
    beforeEach(() => {
      initIntercepts();
      // Common config for all dropdown ordering tests - remove notebook sizes
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: true,
          notebookSizes: [], // Remove notebook sizes to test only hardware profiles
          hardwareProfileOrder: [], // Will be overridden by individual tests if needed
        }),
      );
    });

    it('should display dropdown options in alphabetical order when no hardwareProfileOrder is configured', () => {
      // Set hardware profiles for this test
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({ name: 'zebra-profile', displayName: 'Zebra Profile' }),
          mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
          mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      // Debug: Check if hardware profile section exists
      hardwareProfileSection
        .findSelect()
        .should('exist')
        .then(($el) => {
          cy.log('Hardware profile dropdown exists:', $el.length > 0);
        });

      hardwareProfileSection.findSelect().click();

      // Debug: Log all profile names to see what's actually in the dropdown
      cy.findAllByRole('option').then(($options) => {
        const profileNames = [...$options].map((el) => el.textContent);
        cy.log('Actual profiles in dropdown:', profileNames.join(', '));
      });

      // Verify alphabetical order with only hardware profiles (notebook sizes disabled)
      const expectedOrder = [
        'Alpha Profile',
        'Beta Profile',
        'Large Profile',
        'Small Profile',
        'Zebra Profile',
      ];

      // Verify total count first
      cy.findAllByRole('option').should('have.length', expectedOrder.length);

      // Then verify each position contains expected text
      expectedOrder.forEach((profileName, index) => {
        cy.findAllByRole('option').eq(index).should('contain', profileName);
      });
    });

    it('should display dropdown options in custom order when hardwareProfileOrder is configured', () => {
      // Override with custom hardware profile order
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: true,
          hardwareProfileOrder: ['zebra-profile', 'alpha-profile', 'beta-profile'],
          notebookSizes: [],
        }),
      );

      // Override with just the profiles needed for this test
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
          mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
          mockHardwareProfile({ name: 'zebra-profile', displayName: 'Zebra Profile' }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      hardwareProfileSection.findSelect().click();

      // Verify custom order
      const expectedOrder = ['Zebra Profile', 'Alpha Profile', 'Beta Profile'];
      expectedOrder.forEach((profileName, index) => {
        cy.findAllByRole('option').eq(index).should('contain', profileName);
      });
    });

    it('should handle partial ordering by appending unlisted profiles alphabetically', () => {
      // Override with partial ordering
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: true,
          hardwareProfileOrder: ['beta-profile'], // Only beta specified
          notebookSizes: [],
        }),
      );

      // Override with additional profiles for this test
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
          mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
          mockHardwareProfile({ name: 'zebra-profile', displayName: 'Zebra Profile' }),
          mockHardwareProfile({ name: 'delta-profile', displayName: 'Delta Profile' }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      hardwareProfileSection.findSelect().click();

      // Verify beta comes first (from order), then others alphabetically
      const expectedOrder = [
        'Beta Profile', // From hardwareProfileOrder
        'Alpha Profile', // Alphabetical
        'Delta Profile', // Alphabetical
        'Large Profile', // Alphabetical
        'Small Profile', // Alphabetical
        'Zebra Profile', // Alphabetical
      ];
      expectedOrder.forEach((profileName, index) => {
        cy.findAllByRole('option').eq(index).should('contain', profileName);
      });
    });

    it('should maintain custom order consistency during search filtering', () => {
      // Override with specific order for alpha profiles - enable project-scoped for search functionality
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: false, // Enable to get search input
          hardwareProfileOrder: [
            'gamma-profile',
            'alpha-two-profile',
            'beta-profile',
            'alpha-one-profile',
          ],
          notebookSizes: [],
        }),
      );

      // Override with specific profiles for this test
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({ name: 'alpha-one-profile', displayName: 'Alpha One Profile' }),
          mockHardwareProfile({ name: 'alpha-two-profile', displayName: 'Alpha Two Profile' }),
          mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
          mockHardwareProfile({ name: 'gamma-profile', displayName: 'Gamma Profile' }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      // Open the searchable dropdown (used when project-scoped is enabled)
      hardwareProfileSection.findHardwareProfileSearchSelector().click();

      // Type search filter using helper function
      hardwareProfileSection.findHardwareProfileSearchInput().type('alpha');

      // Verify alpha profiles maintain custom order (Alpha Two before Alpha One)
      // After filtering, options are within menuitem roles in the dropdown
      cy.findAllByRole('menuitem').should('have.length', 2);
      cy.findAllByRole('menuitem').eq(0).should('contain', 'Alpha Two Profile');
      cy.findAllByRole('menuitem').eq(1).should('contain', 'Alpha One Profile');
    });

    it('should ignore deleted profiles in hardwareProfileOrder configuration', () => {
      // Override with deleted profile in order
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: true,
          hardwareProfileOrder: ['gamma-profile', 'deleted-profile', 'alpha-profile'],
          notebookSizes: [],
        }),
      );

      // Override with limited profiles (deleted-profile not included)
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
          mockHardwareProfile({ name: 'gamma-profile', displayName: 'Gamma Profile' }),
          // Note: deleted-profile is not included
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      hardwareProfileSection.findSelect().click();

      // Verify only existing profiles are shown in correct order
      const expectedOrder = ['Gamma Profile', 'Alpha Profile'];
      expectedOrder.forEach((profileName, index) => {
        cy.findAllByRole('option').eq(index).should('contain', profileName);
      });
    });
  });

  describe('Hardware profiles column state labels in the workbenches table', () => {
    it('should show "Deleted" label when hardware profile is deleted', () => {
      initIntercepts({});

      // Mock notebook with hardware profile annotation
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'deleted-profile',
            displayName: 'Test Notebook',
          }),
        ]),
      );

      // Mock the hardware profile as deleted (404 error)
      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'deleted-profile',
        },
        {
          statusCode: 404,
          body: {
            kind: 'Status',
            apiVersion: 'v1',
            code: 404,
            message: 'hardwareprofiles.infrastructure.opendatahub.io "deleted-profile" not found',
            reason: 'NotFound',
            status: 'Failure',
          },
        },
      );

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify "Deleted" label appears in hardware profile column
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileColumn()
        .should('contain', 'Deleted');

      // Verify "Deleted" popover shows correct message
      workbenchPage.getNotebookRow('Test Notebook').findHardwareProfileDeletedLabel().click();
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileDeletedPopover()
        .title()
        .should('be.visible');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileDeletedPopover()
        .body()
        .should('be.visible');
    });

    it('should show "Disabled" label when hardware profile is disabled', () => {
      initIntercepts({});

      // Mock notebook with hardware profile annotation
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'disabled-profile',
            displayName: 'Test Notebook',
          }),
        ]),
      );

      // Mock disabled hardware profile
      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'disabled-profile',
        },
        mockHardwareProfile({
          name: 'disabled-profile',
          displayName: 'Disabled Profile',
          annotations: {
            'opendatahub.io/disabled': 'true',
          },
          identifiers: [
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
            },
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '2Gi',
              maxCount: '4Gi',
              defaultCount: '2Gi',
            },
          ],
        }),
      );

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify "Disabled" label appears in hardware profile column
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileColumn()
        .should('contain', 'Disabled');

      // Verify "Disabled" popover shows correct message
      workbenchPage.getNotebookRow('Test Notebook').findHardwareProfileDisabledLabel().click();
      cy.findByTestId('hardware-profile-status-disabled-popover-title').should('be.visible');
      cy.findByTestId('hardware-profile-status-disabled-popover-body').should('be.visible');
    });

    it('should show "Updated" label when hardware profile spec has changed', () => {
      initIntercepts({});

      // Mock notebook with hardware profile annotation and spec snapshot
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'updated-profile',
            displayName: 'Test Notebook',
            opts: {
              metadata: {
                annotations: {
                  'opendatahub.io/hardware-profile-name': 'updated-profile',
                  'opendatahub.io/hardware-profile-resource-version': '104110942',
                },
              },
            },
          }),
        ]),
      );

      // Mock hardware profile with different spec (updated)
      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'updated-profile',
        },
        mockHardwareProfile({
          name: 'updated-profile',
          displayName: 'Updated Profile',
          annotations: {
            'opendatahub.io/disabled': 'false',
          },
          identifiers: [
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '2',
              maxCount: '4',
              defaultCount: '2',
            },
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '4Gi',
              maxCount: '8Gi',
              defaultCount: '4Gi',
            },
          ],
          resourceVersion: '104110943',
        }),
      );

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify "Updated" label appears in hardware profile column
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileColumn()
        .should('contain', 'Updated');

      // Verify "Updated" popover shows correct message
      workbenchPage.getNotebookRow('Test Notebook').findHardwareProfileUpdatedLabel().click();
      cy.findByTestId('hardware-profile-status-updated-popover-title').should('be.visible');
      cy.findByTestId('hardware-profile-status-updated-popover-body').should('be.visible');
    });

    it('should show binding state labels for running workbenches', () => {
      initIntercepts({});

      // Mock running notebook with deleted hardware profile
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'deleted-profile',
            displayName: 'Running Notebook',
            opts: {
              metadata: {
                annotations: {
                  'opendatahub.io/hardware-profile-name': 'deleted-profile',
                  // No stop annotation = running
                },
              },
            },
          }),
        ]),
      );

      // Mock the hardware profile as deleted (404 error)
      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'deleted-profile',
        },
        {
          statusCode: 404,
          body: {
            kind: 'Status',
            apiVersion: 'v1',
            code: 404,
            message: 'hardwareprofiles.infrastructure.opendatahub.io "deleted-profile" not found',
            reason: 'NotFound',
            status: 'Failure',
          },
        },
      );

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify "Deleted" label appears
      workbenchPage
        .getNotebookRow('Running Notebook')
        .findHardwareProfileDeletedLabel()
        .should('exist');

      // Verify popover mentions running workbench
      workbenchPage.getNotebookRow('Running Notebook').findHardwareProfileDeletedLabel().click();
      cy.findByTestId('hardware-profile-status-deleted-popover-body').should('be.visible');
    });

    it('should show error icon with popover when hardware profile fails to load (non-404 error)', () => {
      initIntercepts({});

      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'error-profile',
            hardwareProfileNamespace: 'opendatahub',
            displayName: 'Test Notebook',
          }),
        ]),
      );

      // Mock the hardware profile with a 403 error (forbidden)
      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'error-profile',
        },
        mock403ErrorWithDetails({}),
      );

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify error icon appears
      const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
      const errorIcon = notebookRow.findHardwareProfileErrorIcon();
      errorIcon.should('exist');
      errorIcon.trigger('mouseenter');
      const errorPopoverTitle = notebookRow.findHardwareProfileErrorPopover();
      errorPopoverTitle.should('be.visible');
    });
  });

  describe.only('Hardware profile customization', () => {
    beforeEach(() => {
      initIntercepts();
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({
            name: 'test-profile',
            displayName: 'Test Profile',
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                minCount: '1',
                maxCount: '8',
                defaultCount: '2',
              },
              {
                identifier: 'memory',
                displayName: 'Memory',
                minCount: '2Gi',
                maxCount: '16Gi',
                defaultCount: '8Gi',
              },
            ],
          }),
        ]),
      );

      // Mock notebook with initial values
      cy.interceptK8sList(
        NotebookModel,
        mockK8sResourceList([
          mockNotebookK8sResource({
            opts: {
              spec: {
                template: {
                  spec: {
                    containers: [
                      {
                        name: 'test-notebook',
                        resources: {
                          requests: {
                            cpu: '4',
                            memory: '8Gi',
                          },
                          limits: {
                            cpu: '4',
                            memory: '8Gi',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();

      // Wait for hardware profiles and select the test profile
      hardwareProfileSection.findSelect().click();
      hardwareProfileSection.selectProfileContaining('Test Profile');
      hardwareProfileSection.findCustomizeButton().click();
    });

    it('should show requests and limits info popover', () => {
      // Click info button and verify popover content
      hardwareProfileSection.findRequestsLimitsInfoButton().click();
      hardwareProfileSection.findRequestsLimitsPopover().should('be.visible');

      // Verify popover content
      cy.contains('Requests: A request is the guaranteed minimum amount').should('exist');
      cy.contains('Limits: A limit is the maximum amount').should('exist');
      cy.contains('Request and limit values must be within the minimum and maximum bounds').should(
        'exist',
      );
    });

    it('should handle checkbox interactions correctly', () => {
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        true,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        true,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.REQUEST,
        true,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.LIMIT,
        true,
        false,
      );

      // Set initial values
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '2');
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '4');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '10');

      // Disable CPU requests, CPU limits should also be disabled automatically
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );

      // Re-enable CPU requests - limits should still be unchecked but enabled
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        true,
      );
      // CPU limits should now be enabled (not disabled) and checked
      hardwareProfileSection.findCPULimitsCheckbox().should('not.be.disabled');
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        true,
        false,
      );

      // Now click to disable CPU limits
      hardwareProfileSection.findCPULimitsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        false,
        false,
      );

      hardwareProfileSection.findMemoryRequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );

      // Re-enable Memory requests - limits should still be unchecked but enabled
      hardwareProfileSection.findMemoryRequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.REQUEST,
        true,
      );
      // Memory limits should now be enabled (not disabled) and checked
      hardwareProfileSection.findMemoryLimitsCheckbox().should('not.be.disabled');
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.LIMIT,
        true,
        false,
      );

      // Now click to disable Memory limits
      hardwareProfileSection.findMemoryLimitsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.LIMIT,
        false,
        false,
      );
    });

    it('should validate resource dependencies', () => {
      // Set CPU requests
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '4');

      // Set CPU limits lower than requests - should show error
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '3');
      cy.contains('Limit must be greater than or equal to request').should('exist');

      // Set CPU limits to valid value (equal to request)
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '4');
      cy.contains('Limit must be greater than or equal to request').should('not.exist');

      // Set CPU limits higher than requests (valid)
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '6');
      cy.contains('Limit must be greater than or equal to request').should('not.exist');

      // Set CPU limits higher than max - should show error
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '10');
      cy.contains('Must not exceed 8 Cores').should('exist');

      // Reset CPU to valid values
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '2');
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '4');

      // Set Memory requests
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8');

      // Set Memory limits lower than requests - should show "Limit must be >= request" error
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '6');
      cy.contains('Limit must be greater than or equal to request').should('exist');

      // Set Memory limits equal to requests - should be valid
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '8');
      cy.contains('Limit must be greater than or equal to request').should('not.exist');

      // Set Memory limits higher than requests - should be valid
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '12');
      cy.contains('Limit must be greater than or equal to request').should('not.exist');

      // Set Memory limits above max - should show error
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '20');
      cy.contains('Must not exceed 16 GiB').should('exist');

      // Set Memory requests above max - should show error
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '20');
      cy.contains('Must not exceed 16 GiB').should('exist');

      // Set Memory requests below min - should show error
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '1');
      cy.contains('Must be at least 2 GiB').should('exist');
    });

    it('should validate memory values with units', () => {
      // Set Memory requests with GiB units
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8');
      hardwareProfileSection.selectResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Gi');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '8');
      hardwareProfileSection.selectResourceUnit('memory', ProfileIdentifierType.LIMIT, 'Gi');

      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Gi');
      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.LIMIT, 'Gi');

      // Try setting memory with MiB units
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '9216');
      hardwareProfileSection.selectResourceUnit('memory', ProfileIdentifierType.LIMIT, 'Mi');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '9216');
      hardwareProfileSection.selectResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Mi');

      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.LIMIT, 'Mi');
      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Mi');
    });

    it('should restore previous values when re-enabling checkboxes', () => {
      // Set initial values
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '4');
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '6');

      // Disable CPU requests (should also disable limits)
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );

      // Re-enable CPU requests - should restore previous value
      hardwareProfileSection.findCPURequestsCheckbox().click();
      // Verify the stored value is restored
      hardwareProfileSection.findCPURequestsInput().should('have.value', '4');

      // CPU limits should be automatically re-enabled
      cy.findByTestId('cpu-limits-input').find('input').should('have.value', '6');
      // Set initial values for memory
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '10');

      // Disable Memory requests (should also disable limits)
      hardwareProfileSection.findMemoryRequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );

      // Re-enable Memory requests - should restore previous value
      hardwareProfileSection.findMemoryRequestsCheckbox().click();
      // Verify the stored value is restored
      hardwareProfileSection.findMemoryRequestsInput().should('have.value', '8');

      // Memory limits should be reenabled by enabling requests - should restore previous value
      // Verify the stored value is restored
      hardwareProfileSection.findMemoryLimitsInput().should('have.value', '10');
    });

    it('should handle min/max validation for all resources', () => {
      // CPU validation - below minimum
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '0.5');
      cy.contains('Must be at least 1 Cores').should('exist');

      // CPU validation - above maximum
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '10');
      cy.contains('Must not exceed 8 Cores').should('exist');

      // Memory validation - below minimum
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '1Gi');
      cy.contains('Must be at least 2 GiB').should('exist');

      // Memory validation - above maximum
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '20Gi');
      cy.contains('Must not exceed 16 GiB').should('exist');
    });

    it('should handle rapid checkbox toggle sequences without data loss', () => {
      // Set initial values
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '2');
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '4');

      // Rapidly toggle CPU requests on/off multiple times
      for (let i = 0; i < 3; i++) {
        hardwareProfileSection.findCPURequestsCheckbox().click(); // Uncheck
        hardwareProfileSection.verifyResourceCheckboxState(
          'cpu',
          ProfileIdentifierType.REQUEST,
          false,
        );

        hardwareProfileSection.findCPURequestsCheckbox().click(); // Re-check
        hardwareProfileSection.verifyResourceCheckboxState(
          'cpu',
          ProfileIdentifierType.REQUEST,
          true,
        );

        // Verify value is restored
        hardwareProfileSection.findCPURequestsInput().should('have.value', '2');
        hardwareProfileSection.findCPULimitsInput().should('have.value', '4');
      }

      // Test with memory as well
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '10');

      hardwareProfileSection.findMemoryRequestsCheckbox().click(); // Uncheck
      hardwareProfileSection.findMemoryRequestsCheckbox().click(); // Re-check
      hardwareProfileSection.findMemoryRequestsInput().should('have.value', '8');

      hardwareProfileSection.findMemoryLimitsInput().should('have.value', '10');
    });

    it('should handle checkbox toggle with validation errors present', () => {
      // Set invalid CPU request value (below min)
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '0.5');
      cy.contains('Must be at least 1 Cores').should('exist');

      // Uncheck the checkbox
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        false,
      );

      // Re-enable - error should clear since value is reset
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '0.5');
      cy.contains('Must be at least 1 Cores').should('exist');

      // Fix the value and verify error clears
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '1');
      cy.contains('Must be at least 1 Cores').should('not.exist');
    });

    it('should preserve memory units when toggling checkboxes', () => {
      // Set memory to 8192 Mi
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8192');
      hardwareProfileSection.selectResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Mi');
      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Mi');

      // Toggle memory request checkbox off then on
      hardwareProfileSection.findMemoryRequestsCheckbox().click();
      hardwareProfileSection.findMemoryRequestsCheckbox().click();

      // Verify value and unit (Mi) are both restored
      hardwareProfileSection.findMemoryRequestsInput().should('have.value', '8192');
      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Mi');
    });

    it('should clear dependent limit when disabling request with validation error', () => {
      // Set request with validation error
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '10');
      cy.contains('Must not exceed 8 Cores').should('exist');

      // Set a limit value
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '6');

      // Uncheck request checkbox
      hardwareProfileSection.findCPURequestsCheckbox().click();

      // Verify both request and limit checkboxes are unchecked
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );

      // Verify validation error is gone
      cy.contains('Must not exceed 8 Cores').should('not.exist');
    });

    it('should handle checkbox state when switching between hardware profiles', () => {
      // Select initial profile and customize
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '2');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8');

      // Uncheck CPU requests
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        false,
      );

      // Close customization and switch to another profile
      // Note: We need to re-mock profiles for this to work properly
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({
            name: 'test-profile',
            displayName: 'Test Profile',
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                minCount: '1',
                maxCount: '8',
                defaultCount: '2',
              },
              {
                identifier: 'memory',
                displayName: 'Memory',
                minCount: '2Gi',
                maxCount: '16Gi',
                defaultCount: '8Gi',
              },
            ],
          }),
        ]),
      );

      hardwareProfileSection.selectProfile(
        'Large Profile CPU: Request = 4 Cores; Limit = 4 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
      );

      // Open customization for new profile
      hardwareProfileSection.findCustomizeButton().click();

      // Verify checkboxes are in default state for new profile
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        true,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.REQUEST,
        true,
      );
    });

    it('should handle all resources unchecked scenario', () => {
      // Uncheck all request checkboxes (CPU, Memory)
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.findMemoryRequestsCheckbox().click();

      // Verify all limit checkboxes are also disabled
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );

      // Re-enable one resource and verify behavior
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        true,
      );

      // CPU limit checkbox should now be enabled
      hardwareProfileSection.findCPULimitsCheckbox().should('not.be.disabled');
    });

    it('should maintain validation context across checkbox toggles', () => {
      // Set CPU request to valid value
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '4');

      // Set CPU limit above max (error)
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '10');
      cy.contains('Must not exceed 8 Cores').should('exist');

      // Uncheck CPU request
      hardwareProfileSection.findCPURequestsCheckbox().click();

      // Error should be gone
      cy.contains('Must not exceed 8 Cores').should('not.exist');

      // Re-enable
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '4');

      // Set limit to invalid value again
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '10');

      // Verify validation still works correctly
      cy.contains('Must not exceed 8 Cores').should('exist');
    });

    it('should handle empty hardware profile (no identifiers)', () => {
      // We need to cancel and revisit the page to pick up new intercepts
      createSpawnerPage.findCancelButton().click();

      // Mock empty hardware profile BEFORE revisiting
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({
            name: 'empty-profile',
            displayName: 'Empty Profile',
            identifiers: [],
          }),
        ]),
      ).as('hardwareProfilesWithEmpty');

      // Revisit the project page to trigger fresh intercepts
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();

      // Wait for the new hardware profiles to load
      cy.wait('@hardwareProfilesWithEmpty');

      // Select the empty profile
      hardwareProfileSection.findSelect().click();
      hardwareProfileSection.selectProfileContaining('Empty Profile');

      // Verify the hardware profile section exists but no customization section appears
      hardwareProfileSection.findCustomizeSection().should('not.exist');
    });

    it('should handle hardware profile with empty/undefined min/max values', () => {
      createSpawnerPage.findCancelButton().click();
      // Mock profile with maxCount: undefined for CPU
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({
            name: 'unrestricted-profile',
            displayName: 'Unrestricted Profile',
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                minCount: '1',
                maxCount: undefined,
                defaultCount: '2',
              },
            ],
          }),
        ]),
      ).as('hardwareProfilesUnrestricted');

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();

      // Wait for the new hardware profiles to load
      cy.wait('@hardwareProfilesUnrestricted');
      hardwareProfileSection.findSelect().click();
      hardwareProfileSection.selectProfileContaining('Unrestricted Profile');

      hardwareProfileSection.findCustomizeButton().click();

      // Verify "unrestricted" is shown for max
      cy.contains('Max = unrestricted').should('exist');

      // Test validation with no upper bound - large values should be accepted
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '100');
      cy.contains('Must not exceed').should('not.exist');
    });

    it('should handle completely empty resource state', () => {
      // Start with all checkboxes unchecked
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.findMemoryRequestsCheckbox().click();

      // Verify form doesn't show validation errors (based on new isUndefinedOkay logic)
      cy.contains('Limit must be greater than or equal to request').should('not.exist');

      // Verify no min/max errors
      cy.contains('Must be at least').should('not.exist');
      cy.contains('Must not exceed').should('not.exist');
    });

    it('should handle partial empty state (only requests, no limits)', () => {
      createSpawnerPage.findCancelButton().click();

      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({
            name: 'test-profile',
            displayName: 'Test Profile',
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                minCount: '1',
                maxCount: '8',
                defaultCount: '2',
              },
            ],
          }),
        ]),
      ).as('hardwareProfilesTest');

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();

      // Wait for the new hardware profiles to load
      cy.wait('@hardwareProfilesTest');
      hardwareProfileSection.findSelect().click();
      hardwareProfileSection.selectProfileContaining('Test Profile');

      hardwareProfileSection.findCustomizeButton().click();

      // Enable CPU request only (no limit)
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '2');

      // Explicitly uncheck CPU limits if checked
      hardwareProfileSection.findCPULimitsCheckbox().then(($checkbox) => {
        if ($checkbox.is(':checked')) {
          cy.wrap($checkbox).click();
        }
      });

      // Verify memory section doesn't exist (since profile only has CPU)
      cy.findByTestId('memory-requests-input').should('not.exist');

      // Verify validation passes (no errors about limits being required)
      cy.contains('Limit must be greater than or equal to request').should('not.exist');
    });

    it('should handle GPU resource with checkbox interactions', () => {
      createSpawnerPage.findCancelButton().click();

      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({
            name: 'gpu-profile',
            displayName: 'GPU Profile',
            identifiers: [
              {
                identifier: 'cpu',
                displayName: 'CPU',
                minCount: '1',
                maxCount: '8',
                defaultCount: '2',
              },
              {
                identifier: 'memory',
                displayName: 'Memory',
                minCount: '2Gi',
                maxCount: '16Gi',
                defaultCount: '8Gi',
              },
              {
                identifier: 'nvidia.com/gpu',
                displayName: 'NVIDIA GPU',
                minCount: 1,
                maxCount: 4,
                defaultCount: 1,
              },
            ],
          }),
        ]),
      ).as('hardwareProfilesGPU');

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();

      // Wait for the new hardware profiles to load
      cy.wait('@hardwareProfilesGPU');
      hardwareProfileSection.findSelect().click();
      hardwareProfileSection.selectProfileContaining('GPU Profile');

      hardwareProfileSection.findCustomizeButton().click();

      // Verify GPU checkboxes exist
      hardwareProfileSection.findGPURequestsCheckbox().should('exist');
      hardwareProfileSection.findGPULimitsCheckbox().should('exist');

      // GPU checkboxes should be checked by default (with default values)
      hardwareProfileSection.findGPURequestsCheckbox().should('be.checked');
      hardwareProfileSection.findGPULimitsCheckbox().should('be.checked');

      // Verify default GPU values are set (defaultCount: 1)
      hardwareProfileSection.findGPURequestsInput().should('have.value', '1');
      hardwareProfileSection.findGPULimitsInput().should('have.value', '1');

      // Change GPU request and limit values
      hardwareProfileSection.findGPURequestsInput().clear().type('2');
      hardwareProfileSection.findGPULimitsInput().clear().type('2');

      // Verify GPU values are updated
      hardwareProfileSection.findGPURequestsInput().should('have.value', '2');
      hardwareProfileSection.findGPULimitsInput().should('have.value', '2');

      // Test GPU validation - below minimum
      hardwareProfileSection.findGPURequestsInput().clear().type('0');
      cy.contains('Must be at least 1').should('exist');

      // Test GPU validation - above maximum
      hardwareProfileSection.findGPURequestsInput().clear().type('5');
      cy.contains('Must not exceed 4').should('exist');

      // Set valid GPU values
      hardwareProfileSection.findGPURequestsInput().clear().type('1');
      hardwareProfileSection.findGPULimitsInput().clear().type('2');

      // Test GPU checkbox disable behavior
      hardwareProfileSection.findGPURequestsCheckbox().click();
      hardwareProfileSection.findGPURequestsCheckbox().should('not.be.checked');
      // hardwareProfileSection.findGPULimitsCheckbox().should('not.be.checked');
      hardwareProfileSection.findGPULimitsCheckbox().should('be.disabled');

      // Re-enable GPU request
      hardwareProfileSection.findGPURequestsCheckbox().click();
      hardwareProfileSection.findGPURequestsCheckbox().should('be.checked');

      // GPU limits should be enabled and checked (restored)
      hardwareProfileSection.findGPULimitsCheckbox().should('not.be.disabled');
      hardwareProfileSection.findGPULimitsCheckbox().should('be.checked');

      // Verify restored values
      hardwareProfileSection.findGPURequestsInput().should('have.value', '1');
      hardwareProfileSection.findGPULimitsInput().should('have.value', '2');

      // Test GPU request/limit comparison - limit less than request
      hardwareProfileSection.findGPURequestsInput().clear().type('3');
      hardwareProfileSection.findGPULimitsInput().clear().type('2');
      cy.contains('Limit must be greater than or equal to request').should('exist');

      // Fix the error - set limit equal to request
      hardwareProfileSection.findGPULimitsInput().clear().type('3');
      cy.contains('Limit must be greater than or equal to request').should('not.exist');
    });
  });
});
