from django.db import migrations


def forwards(apps, schema_editor):
    AccountRegistration = apps.get_model("App", "AccountRegistration")
    AccountRegistration.objects.update(is_verified=True)


def backwards(apps, schema_editor):
    AccountRegistration = apps.get_model("App", "AccountRegistration")
    AccountRegistration.objects.update(is_verified=False)


class Migration(migrations.Migration):

    dependencies = [
        ("App", "0011_accountregistration_is_verified"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
