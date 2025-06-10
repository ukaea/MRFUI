"""
Script to retrieve bookings from a SharePoint list and save them to a CSV file.
"""
from office365.runtime.auth.authentication_context import AuthenticationContext
from office365.sharepoint.client_context import ClientContext
import pandas as pd

from getpass import getpass

user_cache = {}


def get_user_info(ctx, user_id):
    
    if not isinstance(user_id, dict):
        return []

    ids = list(user_id.values())
    user_infos = []
    for uid in ids:
        if uid in user_cache:
            user_infos.append(user_cache[uid])
            continue

        try:
            user = ctx.web.get_user_by_id(uid)
            ctx.load(user)
            ctx.execute_query()
            name = user.properties.get('Title', f'UserID:{ids[0]}').split(", ")
            user_info = {
                    'firstName': name[1],
                    'lastName': name[0],
                    'email': user.properties.get('Email', '')
                }
            user_infos.append(user_info)
        except Exception as e:
            print(f"Failed to get user info for ID {user_id}: {e}")
            user_infos.append({
                'firstName': f'User: {user_id}',
                'lastName': '',
                'email': ''
            })

        user_cache[uid] = user_info
    return user_infos


def set_user_fields(ctx, props, field_key, name_key):
    user_field = props.get(field_key)
    if user_field:
        users = get_user_info(ctx, user_field)
        props[name_key] = {i: u for i, u in enumerate(users)}
    else:
        props[name_key] = {}


def get_list_items(ctx, list_url):
    try:
        list_obj = ctx.web.lists.get_by_title(list_url)
        items = list_obj.items
        paged_items = items.paged()
        ctx.load(
            paged_items,
            [
                "Equipment_x0020_Identity", # seid (first 4 digits), seidDescription (string after seid)
                "Job_x0020_Number", # jobID
                "SessionID", # sessionID
                "Sample_x0020_ID", # sampleID
                "Booking_x0020_Start_x0020_Time_x", # bookingStart (YYYY-MM-DDTHH:MM:SSZ)
                "Booking_x0020_End_x0020_Time_x00", # bookingEnd (YYYY-MM-DDTHH:MM:SSZ)
                "User_x0028_Internal_x0029_Id", # internalUser (given as id)
                "User_x0028_external_x0029_", # externalUser
                "Institution", # institution
                "MRF_x0020_Scientific_x0020_SuppoId", # scientificSupport (given as id)
                "Notes_x0020_and_x0020_Other", # notes
                "Work_x0020_Category", # workCategory
                "Sample_x0020_Split0", # sampleSplit (boolean)
                "Sample_x0020_Split", # splitSampleId (string)
                "Tritium", # tritium (boolean)
                "Beryllium", # beryllium (boolean)
                "Beta_x002f_Gamma", # betaGamma (boolean)
            ]
            )
        ctx.execute_query()

        list_data = []
        page_count = 1
        while True:
            #page count will be 1 until we hit 5000 rows
            print(f"Processing page {page_count}...")
            for item in paged_items:
                props = item.properties
                #getting user information from user id columns
                set_user_fields(ctx, props, 'MRF_x0020_Scientific_x0020_SuppoId', 'scientificSupport')
                set_user_fields(ctx, props, 'User_x0028_Internal_x0029_Id', 'internalUser')
            
                list_data.append(props)
            
            page_count += 1
            if not items.has_next:
                break

            paged_items = paged_items.next_page()
            ctx.load(paged_items)
            ctx.execute_query()

        return list_data
    except Exception as e:
        print('Error retrieving list items: ', e)


def main():
    username = input("Username: ")
    password = getpass()

    # url to sharepoint site. 
    url_shrpt = 'https://ukaeauk.sharepoint.com/sites/MRF-SE-RO'
    username_shrpt = username
    password_shrpt = password
    # list in sharepoint site
    list_url_shrpt = 'SE Bookings'

    #Authentication into sharepoint
    ctx_auth = AuthenticationContext(url_shrpt)
    if ctx_auth.acquire_token_for_user(username_shrpt, password_shrpt):
        ctx = ClientContext(url_shrpt, ctx_auth)
        web = ctx.web
        ctx.load(web)
        ctx.execute_query()
        print('Authenticated into sharepoint: ', web.properties['Title'])
    else:
        print(ctx_auth.get_last_error())

    # retrieve list items
    list_items = get_list_items(ctx, list_url_shrpt)
    df = pd.DataFrame(list_items)
    df.to_csv('bookings.csv')

if __name__ == "__main__":
    main()