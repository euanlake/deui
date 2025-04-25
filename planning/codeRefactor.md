# R1 Migration Clean-up Plan: Removing Legacy Code & Simplifying Architecture

## Overview

This plan outlines the steps to remove all references to the older server architecture and eliminate unnecessary translation services that were created during the migration to the R1 API-based architecture. The goal is to simplify the codebase, improve maintainability, and reduce technical debt.

## Analysis Summary

Based on the codebase exploration, we've identified several areas that need cleanup:

1. **Translation Services**: Transformers that convert between old and new data models
2. **Legacy State Management**: Code that maintains backward compatibility with old state structures
3. **Dual API Support**: Logic that handles both old server and R1 API endpoints
4. **Redundant Code**: Unused functions and components related to the old server

## Detailed Clean-up Plan

### Phase 1: Codebase Analysis & Impact Assessment

- [X] **Map All Legacy References**
  - [X] Create a comprehensive inventory of all files containing "legacy" references
  - [X] Classify references by type (state translation, API reference, etc.)
  - [X] Identify dependencies between legacy and modern components
  - **Prompt**: "Search through the codebase for all occurrences of 'legacy' and related terms. Create a spreadsheet with columns for file path, line number, reference context, and reference type (state, API, UI, etc.). Analyze each reference to determine if it's part of a translation layer or a direct dependency on the old architecture."

- [X] **Document Data Model Differences**
  - [X] Compare old server data models with R1 data models
  - [X] Document all translation functions and their purpose
  - [X] Identify which translations can be safely removed vs which require refactoring
  - **Prompt**: "Analyze the data models used in both the legacy system and R1 API. Create a detailed mapping document showing how each field translates between systems. For each transformer function, document its input/output types, purpose, and whether it can be eliminated entirely or needs to be replaced with simpler code."

- [X] **Identify Integration Points**
  - [X] Map application components that depend on legacy state or translations
  - [X] Assess impact of removing these integrations
  - [X] Create a dependency graph to visualize the affected components
  - **Prompt**: "Identify all components that interact with the legacy state system or translation layer. For each component, document how it uses legacy data, what would break if the translation layer was removed, and what changes would be required to have it work directly with R1 data structures. Create a visual dependency graph showing the relationships between components and the translation layer."

### Phase 2: Remove Legacy API Support

- [X] **Eliminate Dual API Support**
  - [X] Remove `useShouldUseR1Api()` hook and related conditional logic
  - [X] Update `useServerUrl()` to only work with R1 API endpoints
  - [X] Remove legacy connection methods in `src/stores/data.ts`
  - [X] Refactor components to assume R1 API is always available
  - **Prompt**: "Refactor the codebase to remove the dual API support pattern. Remove the `useShouldUseR1Api()` hook and update all conditional logic that branches based on API type. Modify the `useServerUrl()` hook to always return R1 API endpoints. In the data store, remove the legacy connection methods and update components to use R1 API directly. Make sure to handle any error cases that previously relied on falling back to the legacy API."

- [X] **Clean Up Legacy Connection Code**
  - [X] Remove old WebSocket connection logic
  - [X] Remove old HTTP endpoint handling
  - [X] Eliminate legacy server connection error handling
  - [X] Delete unused connection phase tracking
  - **Prompt**: "Remove all WebSocket connection code specific to the old server architecture, including the legacy event handlers and state management. Delete the HTTP endpoint handlers that were created for the old server. Clean up the error handling specific to the legacy server connections. Remove the connection phase tracking enum values and state that was specific to the old server architecture."

### Phase 3: Modernize State Management

- [X] **Refactor State Store**
  - [X] Redesign state store to use only R1 data structures
  - [X] Remove `syncR1StateToLegacyState()` function and all references
  - [X] Eliminate legacy state properties from store interface
  - [X] Update all state consumers to use new data structures
  - **Prompt**: "Refactor the state store to exclusively use R1 data structures. Remove the `syncR1StateToLegacyState()` function and all references to it throughout the codebase. Update the store interface to remove legacy state properties like `remoteState` and `properties`. For each state consumer, update the access patterns to use the new R1-based state properties instead of the legacy ones."

- [X] **Update Model Interfaces**
  - [X] Standardize on R1 data models throughout the application
  - [X] Remove old model interfaces that are no longer needed
  - [X] Ensure type safety with the new model structure
  - **Prompt**: "Update all model interfaces to standardize on R1 data structures. Remove interfaces like `RemoteState`, `Properties`, and other legacy types. Replace them with direct references to the R1 API models. Update type definitions to ensure type safety across the application. Make sure all type imports are properly updated and there are no remaining references to the old model interfaces."

- [X] **Clean Up Store Access Hooks**
  - [X] Refactor hooks that access legacy state properties
  - [X] Remove compatibility layer hooks (e.g., `useIsOn`, `useStatus` with legacy support)
  - [X] Create new hooks or update existing ones to directly use R1 state
  - **Prompt**: "Refactor all custom hooks that access the state store. For hooks like `useIsOn`, `useStatus`, and `usePropValue` that currently support both legacy and R1 state, simplify them to only use R1 state. Either create new hooks that directly access R1 state properties or update existing hooks to remove the legacy state access paths. Ensure components using these hooks are updated to work with the new implementations."

### Phase 4: Remove Translation Services

- [X] **Eliminate Transformer Functions**
  - [X] Refactor `src/api/transformers/stateTransformers.ts` to remove legacy mapping
  - [X] Remove R1-to-legacy conversion in `src/api/transformers/restTransformers.ts`
  - [X] Update `src/api/transformers/websocketTransformers.ts` to simplify data handling
  - **Prompt**: "Analyze and refactor the transformer functions across the codebase. In `stateTransformers.ts`, remove functions that map between R1 API machine states and legacy MajorState/MinorState. In `restTransformers.ts`, eliminate functions that convert between R1 formats and legacy application formats. Simplify the `websocketTransformers.ts` file to remove legacy format conversions, keeping only the essential transformations needed for the application."

- [ ] **Simplify Adapter Layer**
  - [ ] Refactor adapters to directly use R1 data structures without translation
  - [ ] Remove unnecessary abstraction layers that existed for compatibility
  - [ ] Streamline API client code to be more direct
  - **Prompt**: "Refactor the API adapter layer to remove unnecessary translations. Update the adapters to work directly with R1 data structures instead of converting them to application-specific formats. Remove abstraction layers that were added solely for compatibility with both API systems. Simplify the API client code to make direct calls to the R1 API without intermediate transformations."

- [X] **Update WebSocket Data Handling**
  - [X] Simplify WebSocket message processing
  - [X] Remove translation of WebSocket data to legacy formats
  - [X] Ensure WebSocket consumers use R1 data structures directly
  - **Prompt**: "Simplify the WebSocket data handling logic. Remove code that translates WebSocket messages from R1 format to legacy application format. Update WebSocket message consumers to directly use the R1 data structure format. Refactor any real-time update logic to work with the native R1 WebSocket message structure without intermediate transformations."

### Phase 5: UI & Component Updates

- [X] **Refactor UI Components**
  - [X] Update components to use R1 data structures directly
  - [X] Remove legacy property dependencies in component props
  - [X] Simplify state access in components
  - **Prompt**: "Update UI components to use R1 data structures directly. For each component that uses legacy state properties, refactor it to use the equivalent R1 state properties. Remove legacy property dependencies from component prop interfaces. Simplify state access in components by directly using the R1 data instead of going through translation layers or compatibility hooks."


- [X] **Simplify Forms and Controls**
  - [X] Update forms to directly interact with R1 API
  - [X] Remove legacy data format handling in form submissions
  - [X] Streamline validation to match R1 requirements
  - **Prompt**: "Simplify form components to interact directly with the R1 API. Update form submission handlers to send data in the format expected by R1 without intermediate transformations. Remove any special handling for legacy data formats. Streamline form validation logic to match the requirements of the R1 API, removing validation steps that were specific to the old server."

### Phase 6: Testing & Quality Assurance

- [X] **Update Test Suite**
  - [X] Remove tests for legacy code and transformers
  - [X] Add tests for direct R1 API interaction
  - [X] Ensure all critical paths are covered after refactoring
  - **Prompt**: "Review and update the test suite to align with the refactored architecture. Remove tests that specifically test legacy code paths or transformer functions that have been eliminated. Add new tests that verify direct interaction with the R1 API. Ensure test coverage for all critical paths in the application, especially those that have been refactored to remove legacy dependencies."

- [X] **User Acceptance Testing**
  - [X] Verify all functionality works with simplified architecture
  - [X] Compare performance before and after refactoring
  - [X] Validate UI behavior consistency
  - **Prompt**: "Create a comprehensive user acceptance testing plan to verify that all functionality works correctly after refactoring. Design test cases that cover all major user flows and edge cases. Compare application performance metrics before and after the refactoring to identify any regressions or improvements. Validate that UI behavior remains consistent despite the internal architectural changes."

### Phase 7: Final Clean-up & Documentation

- [X] **Remove Unused Files**
  - [X] Delete any remaining files related to the old server
  - [X] Remove unused translation utilities and helpers
  - [X] Clean up import statements across the codebase
  - **Prompt**: "Identify and remove any remaining files that were exclusively related to the old server architecture. Delete unused translation utilities and helper functions that are no longer referenced. Clean up import statements throughout the codebase to remove imports from deleted files or modules. Verify that all removed files don't have any remaining dependencies elsewhere in the code."


- [X] **Refine Build Process**
  - [X] Remove any build steps related to legacy compatibility
  - [X] Optimize build process for simplified architecture
  - [X] Update dependency management to remove unused packages
  - **Prompt**: "Audit the build configuration to remove any steps that were specifically for legacy compatibility. Optimize the build process to take advantage of the simplified architecture, potentially reducing build times. Update package.json to remove dependencies that were only needed for the old server or translation layers. Consider upgrading packages now that compatibility constraints are removed."

## Implementation Strategy

1. **Incremental Approach**: Implement changes in small, testable increments
2. **Feature Branches**: Create separate branches for each phase of the refactoring
3. **Continuous Integration**: Ensure tests pass after each significant change
4. **Stakeholder Reviews**: Regular reviews with stakeholders to ensure requirements are met

## Timeline Estimate

- Phase 1: 1-2 days
- Phase 2: 2-3 days
- Phase 3: 3-4 days
- Phase 4: 2-3 days
- Phase 5: 3-4 days
- Phase 6: 2-3 days
- Phase 7: 1-2 days

Total estimated time: 2-3 weeks

## Success Criteria

1. All references to the old server architecture have been removed
2. No translation services remain in the codebase
3. Application performs at least as well as before, ideally better
4. Code complexity metrics show significant improvement
5. All tests pass and functionality remains intact
6. Build process is simplified and more efficient

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking functionality | High | Medium | Comprehensive testing after each phase |
| Performance regression | Medium | Low | Performance benchmarking before and after |
| Incomplete removal of legacy code | Medium | Medium | Code scanning tools and thorough review |
| Extended timeline | Low | Medium | Prioritize high-impact areas first |

## Conclusion

This refactoring plan provides a systematic approach to removing legacy code and simplifying the architecture of the application. By following these steps, we can reduce technical debt, improve maintainability, and create a cleaner codebase that will be easier to extend in the future. 