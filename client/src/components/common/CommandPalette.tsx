import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Icon, Text, BlockStack, InlineStack } from '@shopify/polaris';
import { SearchIcon, HomeIcon, ChartVerticalIcon, PersonIcon, ProductIcon, SettingsIcon } from '@shopify/polaris-icons';

export const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const commands = [
        { id: 'dashboard', title: 'Go to Dashboard', icon: HomeIcon, path: '/dashboard', category: 'Navigation' },
        { id: 'analytics', title: 'Open Intelligence Center', icon: ChartVerticalIcon, path: '/analytics', category: 'Navigation' },
        { id: 'customers', title: 'View Customer List', icon: PersonIcon, path: '/customers', category: 'Data' },
        { id: 'products', title: 'Analyze Products', icon: ProductIcon, path: '/products', category: 'Data' },
        { id: 'settings', title: 'App Settings', icon: SettingsIcon, path: '/settings', category: 'System' },
    ];

    const filteredCommands = commands.filter(cmd =>
        cmd.title.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
    );

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsOpen(prev => !prev);
        }
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    justifyContent: 'center',
                    paddingTop: '15vh'
                }}
                onClick={() => setIsOpen(false)}
            >
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        width: '90%',
                        maxWidth: '600px',
                        height: 'fit-content'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="glass-card" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Icon source={SearchIcon} tone="subdued" />
                            <input
                                autoFocus
                                placeholder="Search commands, pages, or data... (Esc to close)"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '18px',
                                    color: 'var(--p-color-text)'
                                }}
                            />
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '12px' }}>
                            <BlockStack gap="200">
                                {filteredCommands.length > 0 ? (
                                    filteredCommands.map(cmd => (
                                        <div
                                            key={cmd.id}
                                            onClick={() => {
                                                navigate(cmd.path);
                                                setIsOpen(false);
                                            }}
                                            style={{
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <InlineStack gap="300" blockAlign="center">
                                                <div style={{ padding: '8px', background: 'var(--primary-gradient)', borderRadius: '10px', color: 'white' }}>
                                                    <Icon source={cmd.icon} tone="inherit" />
                                                </div>
                                                <BlockStack gap="050">
                                                    <Text as="span" variant="bodyMd" fontWeight="semibold">{cmd.title}</Text>
                                                    <Text as="span" variant="bodySm" tone="subdued">{cmd.category}</Text>
                                                </BlockStack>
                                            </InlineStack>
                                            <div style={{ padding: '4px 8px', background: '#f4f4f5', borderRadius: '6px' }}>
                                                <Text as="span" variant="bodySm" tone="subdued">Enter</Text>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '32px', textAlign: 'center' }}>
                                        <Text as="p" tone="subdued">No results found for "{query}"</Text>
                                    </div>
                                )}
                            </BlockStack>
                        </div>

                        <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--glass-border)' }}>
                            <InlineStack gap="400">
                                <Text as="span" variant="bodySm" tone="subdued">↑↓ to navigate</Text>
                                <Text as="span" variant="bodySm" tone="subdued">↵ to select</Text>
                                <Text as="span" variant="bodySm" tone="subdued">Esc to close</Text>
                            </InlineStack>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
