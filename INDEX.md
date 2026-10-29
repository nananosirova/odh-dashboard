# What's new 3.6 guided tour - PR evidence screenshots

Captured 2026-10-29 against the dev frontend (http://localhost:4010, backend :4000) with a 1440x900 viewport, headless Playwright.
Flag overrides were applied with `?devFeatureFlags=...` and verified via `sessionStorage['odh-feature-flags']` and the "Feature flags are overridden" banner before every capture. The `odh-whats-new-3.6-seen` key was set to `true` before every manual open so auto-launch never interfered. The tour was always opened from the masthead What's new button -> "Start full tour".

ALL_ON  = skillRegistry, dataRegistry, nimWizard, llmGatewayField, dataConnectHub, genAiStudio, genAiMcpRegistryServers, genAiAgentDeployment, agentConfigManagement, featureStoreAdmin, hardwareProfileDRA, inferencePriorityField all `true`; disableLMEval, disableModelServing `false`.
ALL_OFF = every value above inverted.

Note on `-scrolled` files: the popover body is a `max-height: 50vh` scroll container, so at 900px the AI hub and Settings steps clip their lower content (the admin hint / flag list). For every step whose body overflowed, a second shot with the body scrolled to the bottom is included as `<name>-scrolled.png`; the un-suffixed shot is the initial (top) view.

Note on the Gen AI studio entry rename: the entry was renamed twice during the session (Deploy as API -> Deploy agent from the playground -> Agent endpoints). All gen-ai-studio screenshots (01, 02, 02b, and the four 03 Gen AI shots) were re-captured after the final rename and show "Agent endpoints" with the description "Deploy playground configurations as API endpoints listed with your AI assets."

## Admin user (clusteradminuser1)

| File | Scenario | Flag state |
|---|---|---|
| 00-welcome-modal.png | Welcome modal opened from the masthead What's new button | ALL_ON |
| 01-all-on-projects.png | Step 1/6 Projects popover (no new features) | ALL_ON |
| 01-all-on-ai-hub.png | Step 2/6 AI hub popover, all 5 entries available, no labels, no hint | ALL_ON |
| 01-all-on-gen-ai-studio.png | Step 3/6 Gen AI studio popover, MCP servers + Agent endpoints available (re-captured after rename) | ALL_ON |
| 01-all-on-develop-and-train.png | Step 4/6 Develop & train popover, Evaluation gallery available | ALL_ON |
| 01-all-on-observe-and-monitor.png | Step 5/6 Observe & monitor popover, Agent traces available (MLflow installed) | ALL_ON |
| 01-all-on-settings.png | Step 6/6 Settings popover, all 4 entries available | ALL_ON |
| 02-all-off-projects.png | Projects popover (unchanged, no new features) | ALL_OFF |
| 02-all-off-ai-hub.png | AI hub popover, 5x "Unavailable in the cluster" labels (top of body) | ALL_OFF |
| 02-all-off-ai-hub-scrolled.png | Same step scrolled: admin hint listing skillRegistry, dataRegistry, nimWizard, llmGatewayField, dataConnectHub | ALL_OFF |
| 02-all-off-gen-ai-studio.png | Gen AI studio rendered as a MODAL (nav item absent because genAiStudio is off); section label + 2 entry labels; hint lists `genAiStudio (section)`, genAiMcpRegistryServers, genAiAgentDeployment, agentConfigManagement (re-captured after rename) | ALL_OFF |
| 02-all-off-develop-and-train.png | Develop & train popover, Evaluation gallery unavailable; hint says "Set disableLMEval to false" | ALL_OFF |
| 02-all-off-observe-and-monitor.png | Observe & monitor popover, Agent traces still available (MLflow component installed, no flag) | ALL_OFF |
| 02-all-off-settings.png | Settings popover, 4x unavailable labels (top of body, hint list clipped) | ALL_OFF |
| 02-all-off-settings-scrolled.png | Same step scrolled: hint shows "Set disableModelServing to false", featureStoreAdmin, hardwareProfileDRA, inferencePriorityField | ALL_OFF |
| 02b-all-off-gen-ai-studio-section-on.png | Gen AI studio as a popover (section on) with both entries unavailable; hint lists genAiMcpRegistryServers, genAiAgentDeployment, agentConfigManagement and no section line (re-captured after rename) | ALL_OFF except genAiStudio=true |
| 03-off-skillRegistry-ai-hub.png / -scrolled.png | Only Agent skills unavailable; hint lists skillRegistry | ALL_ON, skillRegistry=false |
| 03-off-dataRegistry-ai-hub.png / -scrolled.png | Only Data assets unavailable; hint lists dataRegistry | ALL_ON, dataRegistry=false |
| 03-off-nimWizard-ai-hub.png / -scrolled.png | Only NIM deployments unavailable; hint lists nimWizard | ALL_ON, nimWizard=false |
| 03-off-llmGatewayField-ai-hub.png / -scrolled.png | Only Deployment gateways unavailable; hint lists llmGatewayField | ALL_ON, llmGatewayField=false |
| 03-off-dataConnectHub-ai-hub.png / -scrolled.png | Only Simplified connection management unavailable; hint lists dataConnectHub | ALL_ON, dataConnectHub=false |
| 03-off-genAiMcpRegistryServers-gen-ai-studio.png | Only MCP servers unavailable; hint lists genAiMcpRegistryServers (re-captured after rename) | ALL_ON, genAiMcpRegistryServers=false |
| 03-off-genAiAgentDeployment-gen-ai-studio.png | Only Agent endpoints unavailable; hint lists genAiAgentDeployment only (re-captured after rename) | ALL_ON, genAiAgentDeployment=false |
| 03-off-agentConfigManagement-gen-ai-studio.png | Only Agent endpoints unavailable; hint lists agentConfigManagement only (re-captured after rename) | ALL_ON, agentConfigManagement=false |
| 03-off-genAiAgentDeployment-agentConfigManagement-gen-ai-studio.png | Only Agent endpoints unavailable; hint lists genAiAgentDeployment and agentConfigManagement (re-captured after rename) | ALL_ON, both Gen AI entry flags false |
| 03-off-disableLMEval-develop-and-train.png | Evaluation gallery unavailable; hint says "Set disableLMEval to false" | ALL_ON, disableLMEval=true |
| 03-off-disableModelServing-settings.png / -scrolled.png | Only Runtime library unavailable; hint says "Set disableModelServing to false" | ALL_ON, disableModelServing=true |
| 03-off-featureStoreAdmin-settings.png / -scrolled.png | Only Feature stores unavailable; hint lists featureStoreAdmin | ALL_ON, featureStoreAdmin=false |
| 03-off-hardwareProfileDRA-settings.png / -scrolled.png | Only New hardware profile type unavailable; hint lists hardwareProfileDRA | ALL_ON, hardwareProfileDRA=false |
| 03-off-inferencePriorityField-settings.png / -scrolled.png | Only Inference priority control unavailable; hint lists inferencePriorityField | ALL_ON, inferencePriorityField=false |
| 04-tour-done.png | "You're ready to go!" completion modal after step 6/6 | ALL_ON |
| 05-devflags-modal-guidedTour-default-on.png | Dev feature flags modal (masthead flag launcher -> Edit Flags -> Dev Flags tab): `guidedTour` checked, value `true`, not overridden | no overrides (reset via "Restore Flags to default values") |
| 05b-guidedTour-off-no-masthead-button.png | Masthead with the What's new (lightbulb) button gone; seen key was cleared and the page reloaded, no auto-launch after 4s (verified: no `whats-new-modal` / `nav-tour-popover` in DOM) | `guidedTour=false` only |

## Non-admin user (dev "Start impersonate" -> system:serviceaccount:model-demo:mlflow-pr-review)

Backend `/api/status` during impersonation reported `isAdmin: false`, `isImpersonating: true`. The home page showed "Error loading projects / Unauthorized" for this account but the dashboard shell, nav, and What's new button loaded, so the tour could be captured. The tour has 5 steps (no Settings step) for this user.

| File | Scenario | Flag state |
|---|---|---|
| 06-nonadmin-impersonating-dashboard.png | Impersonated home page: "Stop impersonate" indicator in the masthead, projects error. NOTE: the left nav still shows a Settings section (Environment setup, Feature stores, Hardware profiles, User management) for this account | ALL_ON minus Gen AI entry flags (leftover from previous run; irrelevant to this shot) |
| 06-nonadmin-all-on-projects.png | Step 1/5 Projects popover | ALL_ON |
| 06-nonadmin-all-on-ai-hub.png | Step 2/5 AI hub popover, all available | ALL_ON |
| 06-nonadmin-all-on-gen-ai-studio.png | Step 3/5 Gen AI studio popover, shows "Agent endpoints" | ALL_ON |
| 06-nonadmin-all-on-develop-and-train.png | Step 4/5 Develop & train popover | ALL_ON |
| 06-nonadmin-all-on-observe-and-monitor.png | Step 5/5 Observe & monitor popover (last step; Next leads to completion) | ALL_ON |
| 07-nonadmin-all-off-projects.png | Projects popover | ALL_OFF |
| 07-nonadmin-all-off-ai-hub.png | AI hub popover, 5 unavailable labels (top of body) | ALL_OFF |
| 07-nonadmin-all-off-ai-hub-scrolled.png | Same step scrolled: "Contact your administrator to request access to unavailable features." and no flag list | ALL_OFF |
| 07-nonadmin-all-off-gen-ai-studio.png | Gen AI studio as a MODAL (section off), section + entry labels, "Contact your administrator" hint, no flag list | ALL_OFF |
| 07-nonadmin-all-off-develop-and-train.png | Evaluation gallery unavailable, "Contact your administrator" hint | ALL_OFF |
| 07-nonadmin-all-off-observe-and-monitor.png | Agent traces available (MLflow installed), no hint | ALL_OFF |

After the non-admin captures, "Stop impersonate" was clicked (`/api/status` returned `isAdmin: true`) and flag overrides were restored to defaults.
