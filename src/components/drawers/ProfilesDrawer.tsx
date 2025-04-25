import React, { useEffect } from 'react'
import Drawer, { DrawerProps } from '$/components/drawers/Drawer'
import ListItem from '$/components/ListItem'
import tw from 'twin.macro'
import { useDataStore } from '$/stores/data'
import axios from 'axios'
import { useServerUrl } from '$/hooks'

interface ProfilesDrawerProps extends Pick<DrawerProps, 'onReject'> {
    onResolve?: () => void
}

export default function ProfilesDrawer({ onReject, onResolve }: ProfilesDrawerProps) {
    const {
        profiles,
        remoteState: { profileId },
        loadProfilesFromFiles,
    } = useDataStore()

    const url = useServerUrl({ protocol: 'http' })
    
    // Load profiles from files when the drawer opens
    useEffect(() => {
        loadProfilesFromFiles();
    }, [loadProfilesFromFiles]);

    // Access the full data store to update state
    const dataStore = useDataStore.getState();

    return (
        <Drawer
            onReject={onReject}
            css={tw`
                hidden
                lg:block
            `}
        >
            <ul css={tw`py-20`}>
                {profiles.map(({ id, title }) => (
                    <li key={id}>
                        <ListItem
                            id={id}
                            onClick={async () => {
                                try {
                                    // Find the profile in the profiles array
                                    const selectedProfile = profiles.find(profile => profile.id === id);
                                    if (!selectedProfile) {
                                        console.error(`Profile with id ${id} not found`);
                                        return;
                                    }
                                    
                                    // Ensure profile has the correct format for the API
                                    const formattedProfile = {
                                        ...selectedProfile,
                                        // Ensure version is a string as required by the API
                                        version: typeof selectedProfile.version === 'number' 
                                            ? selectedProfile.version.toString() 
                                            : selectedProfile.version || '1.0',
                                    };
                                    
                                    // Only include fields that the API expects
                                    const apiProfile = {
                                        title: formattedProfile.title,
                                        author: formattedProfile.author || 'User',
                                        notes: formattedProfile.notes || '',
                                        beverage_type: formattedProfile.beverage_type || 'espresso',
                                        version: formattedProfile.version,
                                        steps: formattedProfile.steps || [],
                                        target_volume: formattedProfile.target_volume,
                                        target_weight: formattedProfile.target_weight,
                                        target_volume_count_start: formattedProfile.target_volume_count_start,
                                        tank_temperature: formattedProfile.tank_temperature
                                    };
                                    
                                    console.log('Sending profile to DE1:', apiProfile);
                                    
                                    // Send the profile to the DE1 using the API v1 endpoint
                                    await axios.post(`${url}/api/v1/de1/profile`, apiProfile);
                                    console.log(`Sent profile ${id} to DE1`);

                                    // Update the profileId in the store
                                    useDataStore.setState(state => ({
                                        remoteState: {
                                            ...state.remoteState,
                                            profileId: id
                                        }
                                    }));
                                    console.log(`Updated profileId in store to: ${id}`);

                                    onResolve?.()
                                } catch (error) {
                                    console.error('Error sending profile to DE1:', error);
                                }
                            }}
                            active={id === profileId}
                        >
                            {title}
                        </ListItem>
                    </li>
                ))}
            </ul>
        </Drawer>
    )
}
