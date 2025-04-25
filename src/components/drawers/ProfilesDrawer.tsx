import React, { useEffect } from 'react'
import Drawer, { DrawerProps } from '$/components/drawers/Drawer'
import ListItem from '$/components/ListItem'
import tw from 'twin.macro'
import { useDataStore } from '$/stores/data'
import { StorageKey } from '$/shared/types'

interface ProfilesDrawerProps extends Pick<DrawerProps, 'onReject'> {
    onResolve?: () => void
}

export default function ProfilesDrawer({ onReject, onResolve }: ProfilesDrawerProps) {
    const {
        profiles,
        profileId,
        loadProfilesFromFiles,
        uploadProfile
    } = useDataStore()
    
    // Load profiles from files when the drawer opens
    useEffect(() => {
        loadProfilesFromFiles();
    }, [loadProfilesFromFiles]);

    return (
        <Drawer
            onReject={onReject}
            css={tw`
                hidden
                lg:block
            `}
        >
            <ul css={tw`py-20`}>
                {profiles.filter(profile => profile.id).map(profile => (
                    <li key={profile.id}>
                        <ListItem
                            id={profile.id || ''}
                            onClick={async () => {
                                try {
                                    if (!profile.id) return;
                                    
                                    // Upload profile using the data store method
                                    await uploadProfile(profile);
                                    
                                    // Update the profileId in the store
                                    useDataStore.setState({ profileId: profile.id });
                                    
                                    // Save to localStorage for persistence across sessions
                                    localStorage.setItem(StorageKey.LastUsedProfile, profile.id);

                                    onResolve?.()
                                } catch (error) {
                                    console.error('Error uploading profile:', error);
                                }
                            }}
                            active={profile.id === profileId}
                        >
                            {profile.title}
                        </ListItem>
                    </li>
                ))}
            </ul>
        </Drawer>
    )
}
