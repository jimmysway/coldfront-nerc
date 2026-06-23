import os
import pkgutil

from django.core.exceptions import ImproperlyConfigured
from coldfront.config.settings import *
from coldfront.config.env import ENV
from coldfront.config.core import ALLOCATION_ATTRIBUTE_VIEW_LIST


NERC_STD_PLUGIN_CONFIGS = [
    'coldfront_plugin_api.config',
    'coldfront_plugin_cloud.config',
    'coldfront_plugin_keycloak_usersearch',
]

NERC_ENV_PLUGIN_CONFIGS = ENV.list('NERC_ENV_PLUGIN_CONFIGS', default=[])

NERC_ALL_PLUGIN_CONFIGS = NERC_STD_PLUGIN_CONFIGS + NERC_ENV_PLUGIN_CONFIGS
for cnf in NERC_ALL_PLUGIN_CONFIGS:
    ldr = pkgutil.get_loader(cnf)
    if ldr is not None:
        include(ldr.get_filename())
    else:
        raise ImproperlyConfigured(f"Plugin {cnf} specified but not found.")


ADDITIONAL_USER_SEARCH_CLASSES = ["coldfront_plugin_keycloak_usersearch.search.KeycloakUserSearch"]

# ColdFront upstream ignores the env var even though it exposes the setting.
# https://github.com/ubccr/coldfront/blob/c490acddd2853a39201ebc58d3ba0d2c1eb8f623/coldfront/config/core.py#L80
ACCOUNT_CREATION_TEXT = os.getenv('ACCOUNT_CREATION_TEXT')

# Removes the Invoice menu from the menu bar.
INVOICE_ENABLED = False

SESSION_COOKIE_SAMESITE = ENV.get_value('SESSION_COOKIE_SAMESITE',
                                        default='Lax')

if os.getenv('DEBUG', 'False') == 'True':
    SESSION_COOKIE_SECURE = False

DATABASES = {
    'default': {
        'ENGINE': ENV.get_value(
            'DATABASE_ENGINE',
            default='django.db.backends.mysql'
        ),
        'NAME': ENV.get_value('DATABASE_NAME', default='coldfront'),
        'USER': ENV.get_value('DATABASE_USER'),
        'PASSWORD': ENV.get_value('DATABASE_PASSWORD'),
        'HOST': ENV.get_value('DATABASE_HOST'),
        'PORT': ENV.get_value('DATABASE_PORT', default=3306),
    },
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'mozilla_django_oidc.contrib.drf.OIDCAuthentication',
    ]
}

if ENV.get_value('REDIS_HOST', default=None):
    Q_CLUSTER = {
        'name': 'coldfront',
        'workers': 4,
        'recycle': 500,
        'timeout': 60,
        'compress': True,
        'save_limit': 250,
        'queue_limit': 500,
        'cpu_affinity': 1,
        'label': 'Django Q',
        'redis': {
            'host': ENV.get_value('REDIS_HOST'),
            'port': 6379,
            'db': 0, }
    }

if 'Allocated Project Name' not in ALLOCATION_ATTRIBUTE_VIEW_LIST:
    ALLOCATION_ATTRIBUTE_VIEW_LIST += [
        'Allocated Project Name'
    ]
