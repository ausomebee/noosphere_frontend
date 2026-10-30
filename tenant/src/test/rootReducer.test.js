import { describe, it, expect } from 'vitest';
import rootReducer from '../ReduxStore/rootReducer';

describe('rootReducer', () => {
  const state = rootReducer(undefined, { type: '@@INIT' });

  it('has authentication slice', () => {
    expect(state).toHaveProperty('authentication');
    expect(state.authentication).toHaveProperty('isAuthenticated');
  });

  it('has pipeline slice', () => {
    expect(state).toHaveProperty('pipeline');
    expect(state.pipeline).toHaveProperty('columns');
    expect(state.pipeline).toHaveProperty('columnOrder');
  });

  it('has formBuilder slice', () => {
    expect(state).toHaveProperty('formBuilder');
    expect(state.formBuilder).toHaveProperty('formName');
    expect(state.formBuilder).toHaveProperty('elements');
  });

  it('has addClient slice', () => {
    expect(state).toHaveProperty('addClient');
    expect(state.addClient).toHaveProperty('formData');
  });

  it('has subDomain slice', () => {
    expect(state).toHaveProperty('subDomain');
    expect(state.subDomain).toHaveProperty('subdomain');
    expect(state.subDomain).toHaveProperty('loading');
  });

  it('has roleDraft slice', () => {
    expect(state).toHaveProperty('roleDraft');
    expect(state.roleDraft).toHaveProperty('roleName');
    expect(state.roleDraft).toHaveProperty('permissions');
  });

  it('has all expected slices', () => {
    const expectedKeys = [
      'authentication',
      'pipeline',
      'addTargetDraft',
      'staffFormDraft',
      'formBuilder',
      'addClient',
      'subDomain',
      'clinicalReportTemplate',
      'clinicalReport',
      'roleDraft',
    ];
    expectedKeys.forEach((key) => {
      expect(state).toHaveProperty(key);
    });
  });
});
