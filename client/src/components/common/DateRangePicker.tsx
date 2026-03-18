import { useState, useCallback, useEffect } from 'react';
import {
    Modal,
    Button,
    DatePicker,
    OptionList,
    InlineStack,
    Checkbox,
    Select,
    Icon,
    BlockStack,
    Text,
    Divider
} from '@shopify/polaris';
import {
    startOfDay,
    endOfDay,
    subDays,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    startOfQuarter,
    endOfQuarter
} from 'date-fns';
import { CalendarIcon, ArrowRightIcon } from '@shopify/polaris-icons';

interface Props {
    value: {
        preset: string;
        start: Date;
        end: Date;
    };
    compareValue?: {
        enabled: boolean;
        type: string;
    };
    onChange: (
        preset: string,
        start: Date,
        end: Date,
        compare: { enabled: boolean; type: string }
    ) => void;
}

const PRESETS = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'last_365_days', label: 'Last 365 days' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_12_months', label: 'Last 12 months' },
    { value: 'last_year', label: 'Last year' },
    { value: 'this_quarter', label: 'This quarter' },
    { value: 'last_quarter', label: 'Last quarter' },
    { value: 'this_year', label: 'Year to date' },
    { value: 'month_to_date', label: 'Month to date' },
    { value: 'custom', label: 'Custom' },
];

export function DateRangePicker({ value, compareValue, onChange }: Props) {
    const [active, setActive] = useState(false);

    // Internal state for the picker logic
    const [{ month, year }, setDate] = useState({
        month: value.start.getMonth(),
        year: value.start.getFullYear(),
    });

    const [selectedDates, setSelectedDates] = useState({
        start: value.start,
        end: value.end,
    });

    const [selectedPreset, setSelectedPreset] = useState(value.preset);

    const [compareEnabled, setCompareEnabled] = useState(compareValue?.enabled || false);
    const [compareType, setCompareType] = useState(compareValue?.type || 'previous_period');

    useEffect(() => {
        setSelectedDates({ start: value.start, end: value.end });
        setDate({ month: value.start.getMonth(), year: value.start.getFullYear() });
        setSelectedPreset(value.preset);
    }, [value]);

    const toggleActive = useCallback(() => setActive((active) => !active), []);

    const handleMonthChange = useCallback(
        (month: number, year: number) => setDate({ month, year }),
        [],
    );

    const handleDateSelection = useCallback(
        ({ start, end }: { start: Date; end: Date }) => {
            setSelectedDates({ start, end });
            setSelectedPreset('custom');
        },
        [],
    );

    const handlePresetChange = useCallback((newPreset: string[]) => {
        const preset = newPreset[0];
        setSelectedPreset(preset);

        const now = new Date();
        let start = startOfDay(now);
        let end = endOfDay(now);

        // Preset Logic
        switch (preset) {
            case 'today':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'yesterday':
                start = startOfDay(subDays(now, 1));
                end = endOfDay(subDays(now, 1));
                break;
            case 'last_7_days':
                start = startOfDay(subDays(now, 7));
                end = endOfDay(now);
                break;
            case 'last_30_days':
                start = startOfDay(subDays(now, 30));
                end = endOfDay(now);
                break;
            case 'last_90_days':
                start = startOfDay(subDays(now, 90));
                end = endOfDay(now);
                break;
            case 'last_365_days':
                start = startOfDay(subDays(now, 365));
                end = endOfDay(now);
                break;
            case 'last_month':
                start = startOfMonth(subMonths(now, 1));
                end = endOfMonth(subMonths(now, 1));
                break;
            case 'last_12_months':
                start = startOfDay(subMonths(now, 12));
                end = endOfDay(now);
                break;
            case 'last_year':
                start = startOfYear(subDays(startOfYear(now), 1));
                end = endOfYear(subDays(startOfYear(now), 1));
                break;
            case 'this_quarter':
                start = startOfQuarter(now);
                end = endOfDay(now);
                break;
            case 'last_quarter':
                start = startOfQuarter(subMonths(now, 3));
                end = endOfQuarter(subMonths(now, 3));
                break;
            case 'this_year': // Year to date
                start = startOfYear(now);
                end = endOfDay(now);
                break;
            case 'month_to_date':
                start = startOfMonth(now);
                end = endOfDay(now);
                break;
            case 'custom':
                return; // Keep existing selection
            default:
                break;
        }

        setSelectedDates({ start, end });
        setDate({ month: start.getMonth(), year: start.getFullYear() });
    }, []);

    const handleApply = () => {
        onChange(
            selectedPreset,
            startOfDay(selectedDates.start),
            endOfDay(selectedDates.end),
            {
                enabled: compareEnabled,
                type: compareType
            }
        );
        setActive(false);
    };

    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const activator = (
        <Button onClick={toggleActive} icon={CalendarIcon}>
            {selectedPreset !== 'custom' && PRESETS.find(p => p.value === selectedPreset)
                ? PRESETS.find(p => p.value === selectedPreset)?.label
                : `${formatDate(value.start)} - ${formatDate(value.end)}`
            }
        </Button>
    );

    return (
        <>
            {activator}
            <Modal
                open={active}
                onClose={toggleActive}
                title="Select Date Range"
                size="large"
                primaryAction={{
                    content: 'Apply',
                    onAction: handleApply,
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: toggleActive,
                    },
                ]}
            >
                <Modal.Section>
                    <div style={{ display: 'flex', gap: '24px', minHeight: '400px' }}>
                        {/* Sidebar: Presets */}
                        <div style={{ width: '200px', flexShrink: 0, borderRight: '1px solid #dfe3e8', paddingRight: '16px' }}>
                            <BlockStack gap="200">
                                <Text as="h3" variant="headingSm" tone="subdued">Presets</Text>
                                <OptionList
                                    onChange={handlePresetChange}
                                    options={PRESETS}
                                    selected={[selectedPreset]}
                                />
                            </BlockStack>
                        </div>

                        {/* Main Content: Calendar */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Date Inputs Display */}
                            <div style={{ background: '#f6f6f7', padding: '16px', borderRadius: '8px' }}>
                                <InlineStack align="center" gap="400" blockAlign="center">
                                    <div style={{ width: '160px' }}>
                                        <Text as="p" variant="bodySm" tone="subdued">Start Date</Text>
                                        <Text as="p" variant="bodyLg" fontWeight="bold">{formatDate(selectedDates.start)}</Text>
                                    </div>
                                    <Icon source={ArrowRightIcon} tone="subdued" />
                                    <div style={{ width: '160px', textAlign: 'right' }}>
                                        <Text as="p" variant="bodySm" tone="subdued">End Date</Text>
                                        <Text as="p" variant="bodyLg" fontWeight="bold">{selectedDates.end ? formatDate(selectedDates.end) : '-'}</Text>
                                    </div>
                                </InlineStack>
                            </div>

                            {/* Calendar */}
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                <DatePicker
                                    month={month}
                                    year={year}
                                    onChange={handleDateSelection}
                                    onMonthChange={handleMonthChange}
                                    selected={selectedDates}
                                    multiMonth
                                    allowRange
                                />
                            </div>

                            <Divider />

                            {/* Compare Options */}
                            <InlineStack align="start" blockAlign="center" gap="400">
                                <Checkbox
                                    label="Compare with previous period"
                                    checked={compareEnabled}
                                    onChange={setCompareEnabled}
                                />
                                {compareEnabled && (
                                    <div style={{ width: 200 }}>
                                        <Select
                                            label="Compare to"
                                            labelHidden
                                            options={[
                                                { label: 'Previous period', value: 'previous_period' },
                                                { label: 'Previous year', value: 'previous_year' }
                                            ]}
                                            value={compareType}
                                            onChange={setCompareType}
                                        />
                                    </div>
                                )}
                            </InlineStack>
                        </div>
                    </div>
                </Modal.Section>
            </Modal>
        </>
    );
}
