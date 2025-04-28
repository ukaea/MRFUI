"""
Script testing getting data out of Microsoft lists
"""
from office365.runtime.auth.authentication_context import AuthenticationContext
from office365.sharepoint.client_context import ClientContext
import pandas as pd

from getpass import getpass

def get_list_items(ctx, list_url):
    try:
        list_obj = ctx.web.lists.get_by_title(list_url)
        items = list_obj.items  # Getting all items from the list

        paged_items = items.paged() #making sure all pages are included
        ctx.load(paged_items)
        ctx.execute_query()

        list_data = []
        while True:
            for item in paged_items:
                list_data.append(item.properties)
            if not paged_items.has_next:
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