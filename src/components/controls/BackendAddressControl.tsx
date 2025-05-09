import { usePhase, useStatus, useR1ConnectionSettings } from '$/stores/data'
import React, { useRef, useState, useEffect } from 'react'
import tw from 'twin.macro'
import Control, { ControlProps } from '../Control'
import StatusIndicator from '../StatusIndicator'
import TextField, { TextFieldDecorator } from '../primitives/TextField'
import Button from '../primitives/Button'
import { ButtonTheme } from '../primitives/Button'

// Local storage key for server address
const SERVER_ADDRESS_STORAGE_KEY = 'deui_server_address'

// Default server address for first-time users
const DEFAULT_SERVER_ADDRESS = 'localhost:8080'

type Props = Omit<ControlProps, 'fill' | 'pad'>

export default function BackendAddressControl({ label = 'Connection', ...props }: Props) {
    const phase = usePhase()
    const status = useStatus()
    const fieldRef = useRef<HTMLInputElement>(null)
    const { settings, updateSettings } = useR1ConnectionSettings()
    const [isEditing, setIsEditing] = useState(false)
    const [inputValue, setInputValue] = useState('')
    
    // Create the URL display string from R1 connection settings (just host:port)
    const url = `${settings.hostname}:${settings.port}`

    // Load saved server address from localStorage on mount or use default
    useEffect(() => {
        try {
            // First try to get saved address from localStorage
            const savedAddress = localStorage.getItem(SERVER_ADDRESS_STORAGE_KEY)
            
            if (savedAddress) {
                // User has a saved address, use it
                console.log(`Using saved server address: ${savedAddress}`);
                const cleanAddress = savedAddress.replace(/^(https?|wss?):\/\//, '')
                const [hostname, port] = cleanAddress.split(':')
                
                if (hostname && port && !isNaN(parseInt(port, 10))) {
                    updateSettings({
                        hostname,
                        port: parseInt(port, 10),
                        useSecureProtocol: settings.useSecureProtocol
                    })
                }
            } else if (settings.hostname !== 'localhost' || settings.port !== 8080) {
                // No saved address and not using the default, set to default
                console.log(`No saved address, setting default: ${DEFAULT_SERVER_ADDRESS}`);
                updateSettings({
                    hostname: 'localhost',
                    port: 8080,
                    useSecureProtocol: settings.useSecureProtocol
                })
                
                // Save default to localStorage
                localStorage.setItem(SERVER_ADDRESS_STORAGE_KEY, DEFAULT_SERVER_ADDRESS)
            }
        } catch (e) {
            console.error('Error handling server address:', e)
        }
    }, [updateSettings, settings.useSecureProtocol, settings.hostname, settings.port])

    const handleEditClick = () => {
        setIsEditing(true)
        setInputValue(url)
    }

    const handleSaveClick = () => {
        try {
            // Remove any protocol prefix to get clean host:port
            const cleanInput = inputValue.replace(/^(https?|wss?):\/\//, '')
            const [hostname, port] = cleanInput.split(':')
            
            if (hostname && port && !isNaN(parseInt(port, 10))) {
                const portNumber = parseInt(port, 10)
                
                // Update settings in the store with the new hostname and port
                updateSettings({
                    hostname,
                    port: portNumber,
                    useSecureProtocol: settings.useSecureProtocol
                })
                
                // Save clean address (just host:port) to localStorage
                localStorage.setItem(SERVER_ADDRESS_STORAGE_KEY, cleanInput)
                
                console.log(`Saved server address: ${cleanInput}`);
                setIsEditing(false)
            } else {
                console.error('Invalid server address format')
            }
        } catch (e) {
            console.error('Error saving server address:', e)
        }
    }

    const handleCancelClick = () => {
        setIsEditing(false)
        setInputValue('')
    }

    return (
        <Control
            {...props}
            label={
                <>
                    <span>{label}</span>
                    {phase && (
                        <span
                            {...props}
                            css={[
                                tw`
                                    tracking-normal
                                    normal-case
                                    text-medium-grey
                                    text-[0.75rem]
                                `,
                            ]}
                        >
                            {phase}
                        </span>
                    )}
                </>
            }
        >
            <TextFieldDecorator>
                <StatusIndicator
                    value={status}
                    idleCss={tw`
                        text-[#ddd]
                        dark:text-dark-grey
                    `}
                />
                {isEditing ? (
                    <div css={tw`h-full w-full relative`}>
                        <TextField
                            ref={fieldRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="hostname:port (e.g. localhost:8080)"
                        />
                        <div 
                            css={tw`
                                absolute 
                                right-2 
                                top-1/2 
                                -translate-y-1/2 
                                z-10
                                flex
                                gap-2
                            `}
                        >
                            <Button
                                theme={ButtonTheme.None}
                                onClick={handleSaveClick}
                                css={tw`
                                    w-8
                                    h-8
                                    rounded-full
                                    bg-dark-grey
                                    dark:bg-heavy-grey
                                    flex
                                    items-center
                                    justify-center
                                    p-0
                                `}
                            >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 5L4 8L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Button>
                            <Button
                                theme={ButtonTheme.None}
                                onClick={handleCancelClick}
                                css={tw`
                                    w-8
                                    h-8
                                    rounded-full
                                    bg-dark-grey
                                    dark:bg-heavy-grey
                                    flex
                                    items-center
                                    justify-center
                                    p-0
                                `}
                            >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L9 9M1 9L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div css={tw`h-full w-full relative`}>
                        <TextField
                            ref={fieldRef}
                            defaultValue={url}
                            readOnly
                            css={tw`
                                cursor-default
                            `}
                        />
                        <div 
                            css={tw`
                                absolute 
                                right-2 
                                top-1/2 
                                -translate-y-1/2 
                                z-10
                            `}
                        >
                            <Button
                                theme={ButtonTheme.None}
                                onClick={handleEditClick}
                                css={tw`
                                    w-8
                                    h-8
                                    rounded-full
                                    bg-dark-grey
                                    dark:bg-heavy-grey
                                    flex
                                    items-center
                                    justify-center
                                    p-0
                                `}
                            >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8.5 1L9 1.5L3.5 7H3V6.5L8.5 1Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Button>
                        </div>
                    </div>
                )}
            </TextFieldDecorator>
        </Control>
    )
}
