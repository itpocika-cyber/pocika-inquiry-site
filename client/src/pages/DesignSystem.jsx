import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function DesignSystem() {
  return (
    <div className="app-shell">
      <Header />

      <main className="container-app section-block">
        <div className="mb-5">
          <p className="text-helper mb-1">Internal Design Reference</p>
          <h1 className="text-page-title mb-2">POCIKA Design System</h1>
          <p className="text-muted-custom">
            Visual tokens, typography, and component patterns used across the POCIKA Inquiry Management System.
          </p>
        </div>

        {/* Colors Section */}
        <section className="mb-5">
          <h2 className="text-section-title mb-3">Color System</h2>
          <div className="row g-3">
            {[
              { name: 'Navy (Brand)', hex: '#0B1F33', bg: 'var(--color-navy)', text: '#fff' },
              { name: 'Primary Blue', hex: '#2563EB', bg: 'var(--color-primary)', text: '#fff' },
              { name: 'App Background', hex: '#F5F7FA', bg: 'var(--color-bg)', border: true },
              { name: 'Card Surface', hex: '#FFFFFF', bg: 'var(--color-white)', border: true },
              { name: 'Primary Text', hex: '#111827', bg: 'var(--color-text)', text: '#fff' },
              { name: 'Muted Text', hex: '#6B7280', bg: 'var(--color-text-muted)', text: '#fff' },
              { name: 'Success Green', hex: '#16A34A', bg: 'var(--color-success)', text: '#fff' },
              { name: 'Warning Amber', hex: '#D97706', bg: 'var(--color-warning)', text: '#fff' },
              { name: 'Danger Red', hex: '#DC2626', bg: 'var(--color-danger)', text: '#fff' }
            ].map((c, i) => (
              <div key={i} className="col-6 col-md-3">
                <div
                  className="rounded-3 mb-2"
                  style={{
                    height: '72px',
                    backgroundColor: c.bg,
                    border: c.border ? '1px solid var(--color-border)' : 'none'
                  }}
                />
                <div className="text-field-label">{c.name}</div>
                <div className="text-helper">{c.hex}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Opportunity Badges */}
        <section className="mb-5">
          <h2 className="text-section-title mb-3">Opportunity Badges</h2>
          <div className="card-pocika p-4 d-flex flex-wrap gap-3">
            <span className="badge-pocika badge-hot">HOT</span>
            <span className="badge-pocika badge-warm">WARM</span>
            <span className="badge-pocika badge-cold">COLD</span>
            <span className="badge-pocika badge-future-potential">FUTURE POTENTIAL</span>
            <span className="badge-pocika badge-dealer-development">DEALER DEVELOPMENT</span>
            <span className="badge-pocika badge-no-requirement">NO REQUIREMENT</span>
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-5">
          <h2 className="text-section-title mb-3">Buttons (.btn-pocika)</h2>
          <div className="card-pocika p-4 d-flex flex-wrap gap-3 align-items-center">
            <button type="button" className="btn-pocika btn-pocika-primary">
              Primary Button
            </button>
            <button type="button" className="btn-pocika btn-pocika-secondary">
              Secondary Button
            </button>
            <button type="button" className="btn-pocika btn-pocika-ghost">
              Ghost Button
            </button>
            <button type="button" className="btn-pocika btn-pocika-danger-ghost">
              Danger Ghost
            </button>
            <button type="button" className="btn-pocika btn-pocika-primary" disabled>
              Disabled
            </button>
          </div>
        </section>

        {/* Chips & Controls */}
        <section className="mb-5">
          <h2 className="text-section-title mb-3">Chips (.chip-group)</h2>
          <div className="card-pocika p-4">
            <div className="chip-group mb-3">
              <label className="chip-option">
                <input type="radio" name="demoRadio" defaultChecked />
                Selected Option
              </label>
              <label className="chip-option">
                <input type="radio" name="demoRadio" />
                Unselected Option
              </label>
              <label className="chip-option">
                <input type="radio" name="demoRadio" />
                Third Option
              </label>
            </div>

            <div className="chip-group">
              <label className="chip-option">
                <input type="checkbox" defaultChecked />
                Multi Checkbox (Checked)
              </label>
              <label className="chip-option">
                <input type="checkbox" />
                Multi Checkbox (Unchecked)
              </label>
            </div>
          </div>
        </section>

        {/* Inputs */}
        <section className="mb-5">
          <h2 className="text-section-title mb-3">Form Controls (.form-control-pocika)</h2>
          <div className="card-pocika p-4">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="field-label">Text Input</label>
                <input type="text" className="form-control-pocika" placeholder="Sample text input" />
              </div>
              <div className="col-md-6">
                <label className="field-label">
                  Required Field <span className="required-mark">*</span>
                </label>
                <input type="text" className="form-control-pocika is-invalid" defaultValue="Invalid entry" />
                <span className="field-error is-visible">This field has a validation error</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
