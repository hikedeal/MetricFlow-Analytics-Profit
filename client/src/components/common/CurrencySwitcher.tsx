import { useState, useCallback, useMemo } from 'react';
import { Button, Popover, ActionList, TextField, Icon, Box, BlockStack } from '@shopify/polaris';
import { SearchIcon } from '@shopify/polaris-icons';

interface Props {
    currency: string;
    onChange: (currency: string) => void;
}

const CURRENCIES = [
    { value: 'INR', label: 'Indian Rupee (INR ₹)' },
    { value: 'USD', label: 'United States Dollar (USD $)' },
    { value: 'EUR', label: 'Euro (EUR €)' },
    { value: 'GBP', label: 'British Pound (GBP £)' },
    { value: 'AED', label: 'United Arab Emirates Dirham (AED)' },
    { value: 'AUD', label: 'Australian Dollar (AUD $)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD $)' },
];

export function CurrencySwitcher({ currency, onChange }: Props) {
    const [active, setActive] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const toggleActive = useCallback(() => setActive((active) => !active), []);

    const filteredCurrencies = useMemo(() => {
        return CURRENCIES.filter((c) =>
            c.label.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [searchValue]);

    const activator = (
        <Button onClick={toggleActive} disclosure>
            {currency}
        </Button>
    );

    return (
        <Popover
            active={active}
            activator={activator}
            onClose={toggleActive}
            autofocusTarget="first-node"
        >
            <Box padding="200" minWidth="250px">
                <BlockStack gap="200">
                    <TextField
                        label="Search currency"
                        labelHidden
                        value={searchValue}
                        onChange={setSearchValue}
                        prefix={<Icon source={SearchIcon} />}
                        autoComplete="off"
                        placeholder="Search currency"
                    />
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <ActionList
                            items={filteredCurrencies.map((c) => ({
                                content: c.label,
                                onAction: () => {
                                    onChange(c.value);
                                    setActive(false);
                                },
                                active: c.value === currency,
                            }))}
                        />
                    </div>
                </BlockStack>
            </Box>
        </Popover>
    );
}
