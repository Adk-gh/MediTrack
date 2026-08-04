import { render, screen } from '@testing-library/react';
import { Medical } from '../../src/features/admin-clinic/Examination/Medical';
import { supabase } from '../../src/supabase';
import React from 'react';

jest.mock('../../src/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: '9e5aa48a-c30f-4670-8f02-97bfcc1abc33', role: 'nurse' } } },
      }),
    },
  },
}));

declare const console: any;
console.error = jest.fn();

describe('<Medical />', () => {
  it('pre-selects the signed-in nurse', async () => {
    render(<Medical selectedPatient={null} showMessage={() => {}} defaultSchoolYear={null} defaultSemester={null} />);
    const select = await screen.findByLabelText(/Nurse on Duty/i);
    expect(select).toHaveValue('Dioquino, Alvaro');
  });
});
